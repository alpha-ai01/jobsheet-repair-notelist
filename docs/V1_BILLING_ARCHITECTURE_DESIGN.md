# V1 Billing Architecture Design

## 1. Overview
This document defines the V1 Billing, Subscription, Entitlement, Trial, and Session Limit architecture for the SmartRepair application, in compliance with the provided specifications.

## 2. Core Billing Model
- **Plans:** `plans/{planId}` (e.g., `free`, `group_monthly_99`)
- **Subscriptions:** `subscriptions/{subscriptionId}` (status tracking, trial/paid lifecycle)
- **Entitlements:** `entitlements/{uid}` (canonical authorization source)
- **Billing Customers:** `billingCustomers/{uid}` (provider-specific customer IDs)
- **Payments:** `payments/{paymentId}` (payment history)
- **Payment Events:** `paymentEvents/{providerEventId}` (idempotency)
- **Checkout Sessions:** `checkoutSessions/{checkoutId}`

## 3. Trial Lifecycle
- **Eligibility:** ONE-TIME per account (`trialConsumed` in `entitlements/{uid}`).
- **Activation:** Trusted backend only (Callable Function `StartGroupTrial`).
- **Duration:** 30 days.

## 4. Entitlement Layer
- **Source of Truth:** `entitlements/{uid}` (read-only for clients, managed by trusted backend functions).
- **Security:** Firestore Rules will prevent client-side mutations to `entitlements`.

## 5. Session Management
- **Registry:** `userSessions/{uid}/sessions/{sessionId}`
- **Limit:** 2 active sessions for FREE accounts.
- **Enforcement:** Trusted backend functions (`RegisterSession`) will count active sessions and enforce limits.

## 6. Payment Provider Abstraction
- Interface: `PaymentProvider` (abstracts provider-specific logic like 2C2P/Opn).
- Webhook Security: Signature verification and idempotency check using `paymentEvents`.

## 7. Firestore Security Rules
- Client-side writes will be restricted. Only trusted backend functions will modify billing-critical collections (`subscriptions`, `entitlements`, `payments`).
- Existing `workspaces` (likely to be migrated/aliased to `groups`) rules will be updated to enforce Entitlement checks before group creation.

## 8. Implementation Order
1. Define schema & contracts (Backend/Rules/Domain).
2. Backend Functions (StartTrial, CreateCheckout, WebhookHandler, RegisterSession).
3. Update Firestore Rules.
4. Update UI (Billing Entry, Suspension, Session UI).
5. Add comprehensive testing.
6. Migrate legacy (if required).
