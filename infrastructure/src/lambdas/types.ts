export interface IPlanFeature {
  id: string;
  planId: string;
  featureCode: string;
  limitValue: number | null;
  isEnabled: boolean | null;
  isResettable: boolean;
}

export interface IPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  features: IPlanFeature[];
}

export interface ISubscriptionUsage {
  id: string;
  subscriptionId: string;
  featureCode: string;
  currentUsage: number;
  isActive: boolean;
  lastResetAt: Date | null;
  periodStart: Date | null;
  periodEnd: Date | null;
}

export interface ISubscription {
  id: string;
  planId: string;
  companyId: string;
  status: string;
  startDate: Date;
  endDate: Date | null;
  nextBillingDate: Date;
  billingCycle: 'MONTHLY' | 'ANNUAL';
  autoRenew: boolean;
  cancelReason: string | null;
  canceledAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
  usages: ISubscriptionUsage[];
}

export type InvoiceStatus = 'PAID' | 'PENDING' | 'FAILED' | 'VOID' | 'REFUNDED';

export interface IInvoice {
  id: string;
  subscriptionId: string;
  companyId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  billingPeriodStart: Date | string | null;
  billingPeriodEnd: Date | string | null;
  dueDate: Date | string | null;
  paidAt: Date | string | null;
  createdAt: Date | string;
  subscription?: ISubscription;
}
