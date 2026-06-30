// Seed ลีคถ้วยทดสอบ (regression บั๊ก 1: ถ้วยต้องยังบังคับจุดโทษตอนเสมอ)
import { readFileSync } from "node:fs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const PROJECT_ID = readFileSync(new URL("../app/.env.local", import.meta.url), "utf8")
  .split("\n").find((l) => l.startsWith("VITE_FIREBASE_PROJECT_ID")).split("=")[1].trim();
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
initializeApp({ projectId: PROJECT_ID });
const db = getFirestore();

const leagueRef = db.collection("leagues").doc("test-cup-league");
await leagueRef.set({
  name: "ลีคทดสอบถ้วย", format: "cup", matchType: "single", size: 2,
  status: "ongoing", playerIds: ["player-somchai", "player-somsak"], currentRound: 1,
  imageURL: null, createdAt: FieldValue.serverTimestamp(), createdBy: "admin-test",
  startedAt: FieldValue.serverTimestamp(), finishedAt: null,
});

const old = await db.collection("matches").where("leagueId", "==", leagueRef.id).get();
await Promise.all(old.docs.map((d) => d.ref.delete()));

await db.collection("matches").add({
  leagueId: leagueRef.id, kind: "regular", round: 1, slot: 0, leg: null,
  matchCode: "CUPFIN", status: "scheduled", submissions: {}, submissionHistory: [],
  approvedResult: null, walkover: null, contactUnreachable: {}, hasContactIssue: false,
  players: { home: "player-somchai", away: "player-somsak" },
  createdAt: FieldValue.serverTimestamp(),
});

console.log("✅ Seed ลีคถ้วย 'ลีคทดสอบถ้วย' + แมตช์ชิง CUPFIN (somchai vs somsak)");
process.exit(0);
