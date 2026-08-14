import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds
} from "@firebase/rules-unit-testing";

import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  serverTimestamp
} from "firebase/firestore";

import fs from "node:fs";
import {
  before,
  after,
  test
} from "node:test";

let env;

const PROJECT_ID =
  "smart-repair-webteam-test";

before(async () => {

  env =
    await initializeTestEnvironment({
      projectId:
        PROJECT_ID,

      firestore: {
        rules:
          fs.readFileSync(
            "firestore.rules",
            "utf8"
          )
      }
    });


  await env.withSecurityRulesDisabled(
    async context => {

      const db =
        context.firestore();

      await setDoc(
        doc(
          db,
          "workspaces",
          "W"
        ),
        {
          ownerUid:
            "owner",

          name:
            "Workspace",

          status:
            "active",

          plan:
            "free",

          subscriptionStatus:
            "active",

          memberLimit:
            1
        }
      );


      for (const member of [
        {
          uid: "owner",
          role: "owner"
        },
        {
          uid: "manager",
          role: "manager"
        },
        {
          uid: "member",
          role: "member"
        }
      ]) {

        await setDoc(
          doc(
            db,
            "workspaces",
            "W",
            "members",
            member.uid
          ),
          {
            uid:
              member.uid,

            role:
              member.role,

            status:
              "active"
          }
        );
      }


      await setDoc(
        doc(
          db,
          "workspaces",
          "W",
          "invitations",
          "invite-user"
        ),
        {
          emailLower:
            "new@example.com",

          role:
            "member",

          status:
            "accepted",

          invitedByUid:
            "owner",

          respondedByUid:
            "newuser"
        }
      );

    }
  );

});


after(async () => {
  await env.cleanup();
});


function auth(uid, email) {

  return env
    .authenticatedContext(
      uid,
      {
        email:
          email
      }
    )
    .firestore();
}


test(
  "accepted invite recipient can create own membership",
  async () => {

    const db =
      auth(
        "newuser",
        "new@example.com"
      );

    await assertSucceeds(
      setDoc(
        doc(
          db,
          "workspaces",
          "W",
          "members",
          "newuser"
        ),
        {
          uid:
            "newuser",

          role:
            "member",

          status:
            "active",

          email:
            "new@example.com",

          invitationId:
            "invite-user",

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp()
        }
      )
    );
  }
);


test(
  "uninvited user cannot join workspace",
  async () => {

    const db =
      auth(
        "stranger",
        "stranger@example.com"
      );

    await assertFails(
      setDoc(
        doc(
          db,
          "workspaces",
          "W",
          "members",
          "stranger"
        ),
        {
          uid:
            "stranger",

          role:
            "member",

          status:
            "active",

          invitationId:
            "missing"
        }
      )
    );
  }
);


test(
  "manager can remove member",
  async () => {

    const db =
      auth(
        "manager",
        "manager@example.com"
      );

    await assertSucceeds(
      deleteDoc(
        doc(
          db,
          "workspaces",
          "W",
          "members",
          "member"
        )
      )
    );
  }
);


test(
  "manager cannot remove owner",
  async () => {

    const db =
      auth(
        "manager",
        "manager@example.com"
      );

    await assertFails(
      deleteDoc(
        doc(
          db,
          "workspaces",
          "W",
          "members",
          "owner"
        )
      )
    );
  }
);
