CREATE TYPE "subscription_status" AS ENUM ('ACTIVE', 'TRIALING', 'PENDING', 'CANCELLED');
CREATE TYPE "billing_cycle_enum" AS ENUM ('MONTHLY', 'ANNUAL');
CREATE TYPE "invoice_status" AS ENUM ('PAID', 'PENDING', 'FAILED', 'VOID', 'REFUNDED');

CREATE TABLE "plans" (
  "id" uuid PRIMARY KEY,
  "name" varchar NOT NULL,
  "description" varchar NOT NULL,
  "price" decimal(10,2) NOT NULL
);

CREATE TABLE "plan_features" (
  "id" uuid PRIMARY KEY,
  "plan_id" uuid,
  "feature_code" varchar NOT NULL,
  "limit_value" int,
  "is_enabled" bool
);

CREATE TABLE "subscriptions" (
  "id" uuid PRIMARY KEY,
  "plan_id" uuid,
  "company_id" varchar(24) NOT NULL,
  "status" "subscription_status" NOT NULL DEFAULT 'PENDING',
  "start_date" date NOT NULL,
  "end_date" date,
  "next_billing_date" date NOT NULL,
  "billing_cycle" "billing_cycle_enum" NOT NULL,
  "auto_renew" bool NOT NULL DEFAULT true,
  "cancel_reason" text,
  "canceled_at" timestamp,
  "created_at" timestamp DEFAULT 'now()',
  "updated_at" timestamp
);

CREATE TABLE "subscription_usages" (
  "id" uuid PRIMARY KEY,
  "subscription_id" uuid,
  "feature_code" varchar NOT NULL,
  "current_usage" int NOT NULL,
  "is_active" bool NOT NULL,
  "last_reset_at" timestamp,
  "period_start" timestamp,
  "period_end" timestamp
);

CREATE TABLE "invoices" (
  "id" uuid PRIMARY KEY,
  "invoice_number" varchar UNIQUE NOT NULL,
  "subscription_id" uuid,
  "company_id" varchar(24) NOT NULL,
  "amount" decimal(10,2) NOT NULL,
  "currency" varchar(3) NOT NULL,
  "status" "invoice_status" NOT NULL,
  "billing_period_start" date,
  "billing_period_end" date,
  "due_date" date,
  "paid_at" timestamp,
  "created_at" timestamp DEFAULT 'now()'
);

ALTER TABLE "plan_features" ADD FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "subscriptions" ADD FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "subscription_usages" ADD FOREIGN KEY ("subscription_id") REFERENCES "subscriptions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "invoices" ADD FOREIGN KEY ("subscription_id") REFERENCES "subscriptions" ("id") DEFERRABLE INITIALLY IMMEDIATE;


INSERT INTO plans (id, name, description, price) VALUES
('d1a1b1c1-1111-4444-8888-000000000001', 'Free', 'Perfect for individuals and small startups', 0.00),
('d2a2b2c2-2222-4444-8888-000000000002', 'Pro', 'Scalable solution for growing companies', 49.99),
('d3a3b3c3-3333-4444-8888-000000000003', 'Enterprise', 'Custom limits and dedicated support for large organizations', 199.99);

-- Features for the FREE Plan
INSERT INTO plan_features (id, plan_id, feature_code, limit_value, is_enabled) VALUES
(gen_random_uuid(), 'd1a1b1c1-1111-4444-8888-000000000001', 'MAX_USERS', 2, true),
(gen_random_uuid(), 'd1a1b1c1-1111-4444-8888-000000000001', 'ADVANCED_REPORTS', 0, false),
(gen_random_uuid(), 'd1a1b1c1-1111-4444-8888-000000000001', 'API_ACCESS', 0, false);

-- Features for the PRO Plan
INSERT INTO plan_features (id, plan_id, feature_code, limit_value, is_enabled) VALUES
(gen_random_uuid(), 'd2a2b2c2-2222-4444-8888-000000000002', 'MAX_USERS', 20, true),
(gen_random_uuid(), 'd2a2b2c2-2222-4444-8888-000000000002', 'ADVANCED_REPORTS', 0, true),
(gen_random_uuid(), 'd2a2b2c2-2222-4444-8888-000000000002', 'API_ACCESS', 0, false);

-- Features for the ENTERPRISE Plan (Unlimited)
INSERT INTO plan_features (id, plan_id, feature_code, limit_value, is_enabled) VALUES
(gen_random_uuid(), 'd3a3b3c3-3333-4444-8888-000000000003', 'MAX_USERS', 9999, true), -- Effectively unlimited
(gen_random_uuid(), 'd3a3b3c3-3333-4444-8888-000000000003', 'ADVANCED_REPORTS', 0, true),
(gen_random_uuid(), 'd3a3b3c3-3333-4444-8888-000000000003', 'API_ACCESS', 0, true);
