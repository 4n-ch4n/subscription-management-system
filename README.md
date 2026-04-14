# Subscription Management Platform - Microservices Architecture

## Overview
This repository serves as the central orchestrator and launch environment for a highly scalable, multi-tenant Software-as-a-Service (SaaS) backend ecosystem. It encapsulates the deployment configuration for three distinct microservices, demonstrating advanced distributed system design, Domain-Driven Design (DDD), and polyglot persistence.

The platform is designed to handle enterprise requirements including Multi-Tenant Identity, Role-Based Access Control (RBAC), automatic service provisioning, precise usage metering, and robust billing webhooks.

## System Architecture

The ecosystem relies on an Onion Architecture pattern across all specific domains, ensuring clean boundaries between business logic and infrastructure.

### Polyglot Persistence
Each microservice governs its own database, optimized for its specific workload:
- **Security Database (MySQL):** Relational integrity, custom transaction managers, and strict relational mapping for RBAC and identity mapping.
- **Company Database (MongoDB):** Flexible document storage for tenant metadata and organization profiles.
- **Subscription Database (PostgreSQL):** Robust relational mapping for financial records, invoices, and high-throughput usage metering.

### Core Microservices
This repository links to three Git submodules representing the core domains:

1. **Security Microservice (`security-ms` | Port 3000)**
   Acts as the central Identity Provider. Manages user registration, JWT generation, organization (tenant) context switching, and role-based access constraint validations.

2. **Company Microservice (`company-ms` | Port 3001)**
   Manages the identity footprint of tenant organizations. Operates cross-service HTTP clients to automatically provision subscription blueprints on company creation.

3. **Subscription Microservice (`subscription-ms` | Port 3002)**
   The core billing and feature-gating engine. Enforces quotas in real-time, calculates billing cycles, and securely processes third-party payment provider webhooks (e.g., Stripe) using HMAC validations decoupled from standard JWT flows.

## Tech Stack
- **Language:** TypeScript 
- **Runtime:** Node.js
- **Web Framework:** Hono (Edge-optimized API framework)
- **Validation & Docs:** Zod, OpenAPI (Swagger)
- **Databases:** MySQL 8, MongoDB 8, PostgreSQL 17
- **Containerization:** Docker, Docker Compose
- **Scripting & Tooling:** bash, pnpm

## Local Development & Environment Setup

This launcher leverages `docker-compose` to instantly provision the entire distributed network, including the three microservices and their respective databases. Furthermore, it automatically seeds the initial database schemas via initialization scripts.

### Prerequisites
- Docker and Docker Compose installed.
- Git (to fetch submodules).

### Launch Instructions

1. **Clone the repository with submodules:**
   Because the microservices are managed as Git submodules, ensure you clone them recursively:
   ```bash
   git clone --recurse-submodules <repository_url>
   ```
   *(If already cloned, run: `git submodule update --init --recursive`)*

2. **Environment Configuration:**
   A `.env` file is provided in the root directory mapping the inter-service URLs and database root credentials required for the Docker configurations.

3. **Boot the Ecosystem:**
   Spin up the network, build the images, and mount the databases:
   ```bash
   docker-compose up -d --build
   ```

4. **Verify Database Seeding:**
   The `docker-compose.yml` mounts the `./scripts` folder to automatically run:
   - PostgreSQL schema mappings for `subscription-db`
   - MySQL schema mappings for `security-db`
   - A shell script to populate MongoDB collections dynamically

### Accessing the Services
Once running, the interconnected endpoints and auto-generated OpenAPI Swagger documentation are available at:
- **Security-MS:** `http://localhost:3000/public/api-docs`
- **Company-MS:** `http://localhost:3001/public/api-docs`
- **Subscription-MS:** `http://localhost:3002/public/api-docs`

## Future Architecture Roadmap
While the core domain services interact synchronously over HTTP, the ecosystem is decoupled to support future migrations to serverless infrastructures (e.g., AWS Lambdas) alongside message brokers (e.g., AWS SQS or EventBridge) for asynchronous tasks like cron-based subscription renewals and usage roll-ups.