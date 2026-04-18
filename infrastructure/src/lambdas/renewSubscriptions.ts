import { Context, ScheduledEvent } from 'aws-lambda';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { Client } from 'pg';
import { add } from 'date-fns';
import {
  createInvoice,
  getPlans,
  getSubscriptionsToRenew,
  updateSubscription,
  updateSubscriptionUsages,
} from './repository';
import type { IInvoice } from './types';

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

  return cachedDbCredentials
}

export const handler = async (event: ScheduledEvent, context: Context) => {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    await client.connect();

    const subscriptions = await getSubscriptionsToRenew(client);
    if (!subscriptions.length) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No subscriptions to renew' }),
      };
    }

    const plans = await getPlans(client);

    const currentDate = new Date();

    let successCount = 0;
    let failCount = 0;

    for (const subscription of subscriptions) {
      try {
        await client.query('BEGIN');

        const plan = plans.find((p) => p.id === subscription.planId);
        if (!plan) {
          console.warn(
            `Plan with ID ${subscription.planId} not found for subscription ${subscription.id}`,
          );
          await client.query('ROLLBACK');
          continue;
        }

        const newNextBillingDate = add(subscription.nextBillingDate, {
          months: subscription.billingCycle === 'MONTHLY' ? 1 : 12,
        });

        const usagesToUpdate = subscription.usages
          .filter((usage) => usage.isActive)
          .map((usage) => ({
            ...usage,
            currentUsage: plan.features.find(
              (feature) => feature.featureCode === usage.featureCode,
            )?.isResettable
              ? 0
              : usage.currentUsage,
            periodStart: subscription.nextBillingDate,
            periodEnd: newNextBillingDate,
          }));

        const newInvoice: IInvoice = {
          id: crypto.randomUUID(),
          subscriptionId: subscription.id,
          companyId: subscription.companyId,
          invoiceNumber: `INV-${Date.now()}`,
          amount: plan.price,
          currency: 'USD',
          status: 'PENDING',
          billingPeriodStart: subscription.nextBillingDate,
          billingPeriodEnd: newNextBillingDate,
          dueDate: add(currentDate, { days: 7 }),
          paidAt: null,
          createdAt: currentDate,
        };

        await updateSubscription(client, subscription.id, newNextBillingDate);
        await updateSubscriptionUsages(client, usagesToUpdate);
        await createInvoice(client, newInvoice);

        await client.query('COMMIT');
        successCount++;

        // Here the invoice would typically be sent to a billing service for processing such as Stripe,
        // and the subscription status would be updated based on the payment outcome.
      } catch (error) {
        console.error(`Error renewing subscription ${subscription.id}:`, error);
        await client.query('ROLLBACK');
        failCount++;
      }
    }

    console.log(
      `Job Finished. Successfully renewed: ${successCount}. Failed: ${failCount}.`,
    );
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Subscriptions renewal process completed',
        successCount,
        failCount,
      }),
    };
  } catch (error) {
    console.error('Error in renewSubscriptions lambda:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  } finally {
    await client.end();
  }
};
