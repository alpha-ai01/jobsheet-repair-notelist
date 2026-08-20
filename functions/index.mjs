import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

// V1 Billing Functions
export const startGroupTrial = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Unauthorized");
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
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Unauthorized");
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

export const handlePaymentWebhook = onCall(async (request) => {
  const { providerEventId, payload, uid } = request.data;
  // TODO: EXTERNAL_CONFIGURATION_REQUIRED - Stub verification
  logger.info("Verifying signature (stub)...");

  return await db.runTransaction(async (transaction) => {
    const eventRef = db.doc(`paymentEvents/${providerEventId}`);
    const eventSnap = await transaction.get(eventRef);
    if (eventSnap.exists) throw new HttpsError("already-exists", "Event already processed");

    transaction.set(eventRef, { processedAt: Timestamp.now(), payload });

    const subscriptionRef = db.doc(`subscriptions/${uid}`);
    transaction.set(subscriptionRef, {
      uid,
      status: "ACTIVE",
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
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Unauthorized");
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
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Unauthorized");
  const { sessionId } = request.data;

  await db.doc(`userSessions/${uid}/sessions/${sessionId}`).update({
    status: "REVOKED",
    updatedAt: Timestamp.now()
  });

  return { success: true };
});

export const createGroup = onCall(async (request) => {
...

  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Unauthorized");

  return await db.runTransaction(async (transaction) => {
    // Check entitlement
    const entitlementSnap = await transaction.get(db.doc(`entitlements/${uid}`));
    if (!entitlementSnap.exists || !entitlementSnap.data().groupFeatureEnabled) {
      throw new HttpsError("permission-denied", "NO_ENTITLEMENT");
    }

    const groupRef = db.collection("groups").doc();
    transaction.set(groupRef, {
      name: request.data.name,
      ownerUid: uid,
      status: "active",
      createdAt: Timestamp.now()
    });

    transaction.set(groupRef.collection("members").doc(uid), {
      uid,
      role: "owner",
      status: "active",
      createdAt: Timestamp.now()
    });
    
    return { groupId: groupRef.id };
  });
});
