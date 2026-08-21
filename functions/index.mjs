import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

// V1 Billing Functions
export const startGroupTrial = onCall(async (request) => {
  const { uid } = request.data;
  if (!uid) {
    throw new HttpsError("invalid-argument", "Missing uid");
  }

  return await db.runTransaction(async (transaction) => {
    const entitlementRef = db.doc(`entitlements/${uid}`);
    const entitlementSnap = await transaction.get(entitlementRef);
    
    if (entitlementSnap.exists && entitlementSnap.data().trialConsumed) {
      throw new HttpsError("failed-precondition", "TRIAL_ALREADY_CONSUMED");
    }

    const now = Timestamp.now();
    const trialEndsAt = Timestamp.fromMillis(now.toMillis() + 30 * 24 * 60 * 60 * 1000);
    
    transaction.set(entitlementRef, {
      uid,
      trialConsumed: true,
      trialStartedAt: now,
      trialEndsAt: trialEndsAt,
      groupFeatureEnabled: true,
      accessMode: "READ_WRITE",
      updatedAt: now
    }, { merge: true });
    
    transaction.set(db.doc(`subscriptions/${uid}_trial`), {
      uid,
      planId: "group_trial",
      status: "TRIAL",
      trialStartedAt: now,
      trialEndsAt: trialEndsAt,
      createdAt: now
    });

    return { success: true };
  });
});

export const createCheckoutSession = onCall(async (request) => {
  const { uid } = request.data;
  if (!uid) throw new HttpsError("invalid-argument", "Missing uid");
  const { checkoutId, planId } = request.data;
  if (planId !== "group_monthly_99") throw new HttpsError("invalid-argument", "Invalid plan");

  const checkoutSessionRef = db.doc(`checkoutSessions/${checkoutId}`);
  await checkoutSessionRef.set({
    uid,
    planId,
    status: "PENDING",
    createdAt: Timestamp.now()
  });

  return { success: true };
});

export const cancelSubscription = onCall(async (request) => {
  const { uid } = request.data;
  if (!uid) throw new HttpsError("invalid-argument", "Missing uid");

  return await db.runTransaction(async (transaction) => {
    const subscriptionRef = db.doc(`subscriptions/${uid}`);
    transaction.update(subscriptionRef, {
      status: "CANCEL_AT_PERIOD_END",
      cancelAtPeriodEnd: true,
      updatedAt: Timestamp.now()
    });
    
    // Entitlement stays READ_WRITE until period end (handled by policy, not immediate change)
    return { success: true };
  });
});

export const handlePaymentWebhook = onCall(async (request) => {
  const { uid } = request.data;
  if (!uid) throw new HttpsError("invalid-argument", "Missing uid");
  const { providerEventId, payload, signature } = request.data;
  
  // TODO: EXTERNAL_CONFIGURATION_REQUIRED - Implement real signature verification
  if (signature !== "valid-test-signature") {
      throw new HttpsError("unauthenticated", "Invalid signature");
  }

  return await db.runTransaction(async (transaction) => {
    const eventRef = db.doc(`paymentEvents/${providerEventId}`);
    const eventSnap = await transaction.get(eventRef);
    if (eventSnap.exists) throw new HttpsError("already-exists", "Event already processed");

    transaction.set(eventRef, { processedAt: Timestamp.now(), payload });

    // Validate webhook payload (stubbed amount/currency check)
    if (payload.amount !== 99 || payload.currency !== "THB") {
        throw new HttpsError("invalid-argument", "Invalid amount or currency");
    }

    const subscriptionRef = db.doc(`subscriptions/${uid}`);
    transaction.set(subscriptionRef, {
      uid,
      status: "ACTIVE",
      currentPeriodStart: Timestamp.now(),
      currentPeriodEnd: Timestamp.fromMillis(Timestamp.now().toMillis() + 30 * 24 * 60 * 60 * 1000),
      updatedAt: Timestamp.now()
    }, { merge: true });

    const entitlementRef = db.doc(`entitlements/${uid}`);
    transaction.set(entitlementRef, {
      accessMode: "READ_WRITE",
      groupFeatureEnabled: true,
      updatedAt: Timestamp.now()
    }, { merge: true });

    return { success: true };
  });
});

export const registerSession = onCall(async (request) => {
  const { uid } = request.data;
  if (!uid) throw new HttpsError("invalid-argument", "Missing uid");
  const { sessionId } = request.data;

  return await db.runTransaction(async (transaction) => {
    const sessionsRef = db.collection(`userSessions/${uid}/sessions`);
    const activeSessionsSnap = await transaction.get(sessionsRef.where("status", "==", "ACTIVE"));
    
    if (activeSessionsSnap.size >= 2) throw new HttpsError("resource-exhausted", "MAX_SESSIONS");

    transaction.set(db.doc(`userSessions/${uid}/sessions/${sessionId}`), {
      status: "ACTIVE",
      createdAt: Timestamp.now()
    });

    return { success: true };
  });
});
export const revokeSession = onCall(async (request) => {
  const { uid, sessionId } = request.data;
  if (!uid) throw new HttpsError("invalid-argument", "Missing uid");

  await db.doc(`userSessions/${uid}/sessions/${sessionId}`).update({
    status: "REVOKED",
    updatedAt: Timestamp.now()
  });

  return { success: true };
});

export const createGroup = onCall(async (request) => {
  const { uid, name } = request.data;
  if (!uid || !name) throw new HttpsError("invalid-argument", "Missing uid or name");

  return await db.runTransaction(async (transaction) => {
    const groupRef = db.collection("groups").doc();
    const groupId = groupRef.id;

    // Create Group
    transaction.set(groupRef, {
      name,
      ownerUid: uid,
      subscriptionStatus: 'pending_payment',
      createdAt: Timestamp.now()
    });

    // Create Member (Owner)
    transaction.set(groupRef.collection("members").doc(uid), {
      uid,
      role: 'owner',
      joinedAt: Timestamp.now()
    });

    // Create Membership record for easy lookup
    transaction.set(db.collection("memberships").doc(`${groupId}_${uid}`), {
        groupId,
        uid,
        role: 'owner'
    });

    // Create Subscription record
    transaction.set(db.doc(`subscriptions/${groupId}`), {
      groupId,
      status: 'pending_payment',
      createdAt: Timestamp.now()
    });
    
    return { groupId };
  });
});
