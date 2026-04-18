import { Context, ScheduledEvent } from 'aws-lambda';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { Client } from 'pg';
import {
  expireSubscriptions,
  getExpiredInvoices,
  getNonRenewingSubscriptions,
} from './repository';

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION,
});
let cachedDbCredentials: any = null;

const getDbCredentials = async () => {
  if (cachedDbCredentials) return cachedDbCredentials;

  const command = new GetSecretValueCommand({
    SecretId: process.env.SECRET_NAME,
  });

  const response = await secretsClient.send(command);
  cachedDbCredentials = JSON.parse(response.SecretString!);

  return cachedDbCredentials;
};

export const handler = async (event: ScheduledEvent, context: Context) => {
  const credentials = await getDbCredentials();

  const client = new Client({
    host: credentials.DB_HOST,
    port: Number(credentials.DB_PORT),
    user: credentials.DB_USER,
    password: credentials.DB_PASSWORD,
    database: credentials.DB_NAME,
  });

  try {
    await client.connect();

    const invoices = await getExpiredInvoices(client);
    const expiredSubscriptionIds = invoices.map(
      (invoice) => invoice.subscriptionId,
    );

    if (expiredSubscriptionIds.length > 0) {
      await expireSubscriptions(
        client,
        expiredSubscriptionIds,
        'Subscription expired due to unpaid invoice',
      );
    }

    const nonRenewing = await getNonRenewingSubscriptions(client);
    const nonRenewingSubIds = nonRenewing.map((sub) => sub.id);

    if (nonRenewingSubIds.length > 0) {
      await expireSubscriptions(
        client,
        nonRenewingSubIds,
        'Scheduled cancellation at end of cycle',
      );
    }

    const totalProcessed =
      expiredSubscriptionIds.length + nonRenewingSubIds.length;

    if (totalProcessed === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No subscriptions needed expiration' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Expired ${totalProcessed} subscriptions successfully`,
      }),
    };
  } catch (error) {
    console.error('Error in expireSubscriptions lambda:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  } finally {
    await client.end();
  }
};
