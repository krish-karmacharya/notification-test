// Sends one notification to an FCM topic. Run by .github/workflows/push.yml (button in the dashboard).
// Env: FIREBASE_SERVICE_ACCOUNT (JSON string). Args via env: TOPIC, TITLE, BODY, LINK. Add DRY_RUN=1 to only print.
import admin from "firebase-admin";

const { TOPIC, TITLE, BODY, LINK = "", DRY_RUN } = process.env;
const allowed = ["nepal-roads", "nepal-weather", "nepal-alerts"];

if (!allowed.includes(TOPIC)) throw new Error(`TOPIC must be one of ${allowed.join(", ")}`);
if (!TITLE || !BODY) throw new Error("TITLE and BODY are required");
if (TITLE.length > 65 || BODY.length > 200) throw new Error("Too long for a push notification");

const message = {
  topic: TOPIC,
  notification: { title: TITLE, body: BODY },
  data: LINK ? { link: LINK } : {},
  webpush: LINK ? { fcmOptions: { link: LINK } } : undefined,
  android: { priority: "high" },
};

if (DRY_RUN) {
  console.log("DRY RUN, would send:", JSON.stringify(message, null, 2));
  process.exit(0);
}

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const id = await admin.messaging().send(message);
console.log("sent", id, "to", TOPIC);
