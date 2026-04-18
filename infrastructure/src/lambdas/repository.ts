import { Client } from 'pg';
import type {
  IInvoice,
  IPlan,
  IPlanFeature,
  ISubscription,
  ISubscriptionUsage,
} from './types';

export const getSubscriptionsToRenew = async (
  client: Client,
): Promise<ISubscription[]> => {
  const { rows } = await client.query(
    `SELECT subscriptions.*, su.* FROM subscriptions 
        INNER JOIN subscription_usages su ON subscriptions.id = su.subscription_id
        WHERE subscriptions.status IN ('ACTIVE', 'TRIALING') AND
        subscriptions.next_billing_date <= NOW() AND subscriptions.auto_renew = true`,
  );
  if (!rows.length) return [];

  const subscriptionsMap = new Map<string, ISubscription>();
  const usageMap = new Map<string, Map<string, ISubscriptionUsage>>();

  for (const row of rows) {
    const subscriptionId = row.id;

    let subscription = subscriptionsMap.get(subscriptionId);
    if (!subscription) {
      subscription = {
        id: row.id,
        planId: row.plan_id,
        companyId: row.company_id,
        status: row.status,
        startDate: row.start_date,
        endDate: row.end_date,
        nextBillingDate: row.next_billing_date,
        billingCycle: row.billing_cycle,
        autoRenew: row.auto_renew,
        cancelReason: row.cancel_reason,
        canceledAt: row.canceled_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        usages: [],
      };

      subscriptionsMap.set(subscriptionId, subscription);
      usageMap.set(subscriptionId, new Map());
    }

    if (row.usage_id) {
      const usage = usageMap.get(subscriptionId)!;
      if (!usage.has(row.usage_id)) {
        const subscriptionUsage = {
          id: row.usage_id,
          subscriptionId: row.subscription_id,
          featureCode: row.feature_code || '',
          currentUsage: row.current_usage || 0,
          isActive: row.is_active || false,
          lastResetAt: row.last_reset_at,
          periodStart: row.period_start,
          periodEnd: row.period_end,
        };

        usage.set(row.usage_id, subscriptionUsage);
      }
    }
  }

  for (const [subscriptionId, subscription] of subscriptionsMap) {
    subscription.usages = Array.from(
      usageMap.get(subscriptionId)?.values() ?? [],
    );
  }

  return Array.from(subscriptionsMap.values());
};

export const getPlans = async (client: Client): Promise<IPlan[]> => {
  const { rows } = await client.query(
    `SELECT plans.*, pf.* FROM plans
        INNER JOIN plan_features pf ON plans.id = pf.plan_id`,
  );
  if (!rows.length) return [];

  const plansMap = new Map<string, IPlan>();
  const featuresMap = new Map<string, Map<string, IPlanFeature>>();

  for (const row of rows) {
    const planId = row.id;

    let plan = plansMap.get(planId);
    if (!plan) {
      plan = {
        id: row.id,
        name: row.name,
        description: row.description,
        price: row.price,
        features: [],
      };

      plansMap.set(planId, plan);
      featuresMap.set(planId, new Map());
    }

    if (row.feature_id) {
      const feature = featuresMap.get(planId)!;
      if (!feature.has(row.feature_id)) {
        const planFeature = {
          id: row.feature_id,
          planId: row.plan_id,
          featureCode: row.feature_code,
          limitValue: row.limit_value,
          isEnabled: row.is_enabled,
          isResettable: row.is_resettable,
        };

        feature.set(row.feature_id, planFeature);
      }
    }
  }

  for (const [planId, plan] of plansMap) {
    plan.features = Array.from(featuresMap.get(planId)?.values() ?? []);
  }

  return Array.from(plansMap.values());
};

export const updateSubscription = async (
  client: Client,
  subscriptionId: string,
  newNextBillingDate: Date,
): Promise<void> => {
  const query = `UPDATE subscriptions SET end_date = $1, next_billing_date = $2, status = 'ACTIVE',
    updated_at = NOW() WHERE id = $3`;

  await client.query(query, [
    newNextBillingDate,
    newNextBillingDate,
    subscriptionId,
  ]);
};

export const updateSubscriptionUsages = async (
  client: Client,
  usages: ISubscriptionUsage[],
): Promise<void> => {
  if (usages.length === 0) return;

  const ids = usages.map((u) => u.id);
  const currentUsages = usages.map((u) => u.currentUsage);
  const periodStarts = usages.map((u) => u.periodStart);
  const periodEnds = usages.map((u) => u.periodEnd);

  const query = `
    UPDATE subscription_usages AS su
    SET 
      current_usage = data.current_usage, 
      period_start = data.period_start, 
      period_end = data.period_end, 
      last_reset_at = NOW()
    FROM (
      SELECT * FROM unnest(
        $1::uuid[], 
        $2::int[], 
        $3::timestamp[], 
        $4::timestamp[]
      ) AS t(id, current_usage, period_start, period_end)
    ) as data
    WHERE su.id = data.id;
  `;

  await client.query(query, [ids, currentUsages, periodStarts, periodEnds]);
};

export const createInvoice = async (
  client: Client,
  invoice: IInvoice,
): Promise<void> => {
  const query = `INSERT INTO invoices 
    (id, subscription_id, company_id, invoice_number, amount, currency, status, billing_period_start, billing_period_end, due_date, paid_at, created_at) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`;

  await client.query(query, [
    invoice.id,
    invoice.subscriptionId,
    invoice.companyId,
    invoice.invoiceNumber,
    invoice.amount,
    invoice.currency,
    invoice.status,
    invoice.billingPeriodStart,
    invoice.billingPeriodEnd,
    invoice.dueDate,
    invoice.paidAt,
    invoice.createdAt,
  ]);
};

export const getExpiredInvoices = async (
  client: Client,
): Promise<IInvoice[]> => {
  const query = `SELECT invoices.*, subscriptions.* FROM invoices 
    INNER JOIN subscriptions ON invoices.subscription_id = subscriptions.id
    WHERE invoices.status = 'PENDING' AND invoices.due_date < NOW()`;

  const { rows } = await client.query(query);
  if (!rows.length) return [];

  return rows.map((row) => ({
    id: row.id,
    subscriptionId: row.subscription_id,
    companyId: row.company_id,
    invoiceNumber: row.invoice_number,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    billingPeriodStart: row.billing_period_start,
    billingPeriodEnd: row.billing_period_end,
    dueDate: row.due_date,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    subscription: {
      id: row.subscription_id,
      planId: row.plan_id,
      companyId: row.company_id,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      nextBillingDate: row.next_billing_date,
      billingCycle: row.billing_cycle,
      autoRenew: row.auto_renew,
      cancelReason: row.cancel_reason,
      canceledAt: row.canceled_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      usages: [], // For simplicity, not fetching usages here
    },
  }));
};

export const getNonRenewingSubscriptions = async (
  client: Client,
): Promise<ISubscription[]> => {
  const query = `
    SELECT * FROM subscriptions 
    WHERE status IN ('ACTIVE', 'TRIALING') 
      AND auto_renew = false 
      AND next_billing_date <= NOW()
  `;
  const { rows } = await client.query(query);
  
  return rows.map((row) => ({
    id: row.id,
    planId: row.plan_id,
    companyId: row.company_id,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    nextBillingDate: row.next_billing_date,
    billingCycle: row.billing_cycle,
    autoRenew: row.auto_renew,
    cancelReason: row.cancel_reason,
    canceledAt: row.canceled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    usages: [],
  }));
};

export const expireSubscriptions = async (
  client: Client,
  subscriptionIds: string[],
  reason: string,
): Promise<void> => {
  if (!subscriptionIds.length) return;

  const query = `
    UPDATE subscriptions SET status = 'CANCELLED', updated_at = NOW(),
    canceled_at = NOW(), cancel_reason = $2
    WHERE id = ANY($1);
  `;

  await client.query(query, [subscriptionIds, reason]);
};
