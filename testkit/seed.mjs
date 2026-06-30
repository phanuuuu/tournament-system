// Seed ลีคทดสอบลงใน Firebase Emulator (ไม่แตะ production)
// รัน: node testkit/seed.mjs   (ต้องสตาร์ท emulator ก่อน)
import { readFileSync } from "node:fs";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const PROJECT_ID = readFileSync(new URL("../app/.env.local", import.meta.url), "utf8")
  .split("\n").find((l) => l.startsWith("VITE_FIREBASE_PROJECT_ID")).split("=")[1].trim();

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

initializeApp({ projectId: PROJECT_ID });
const auth = getAuth();
const db = getFirestore();

function code() {
  const cs = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => cs[Math.floor(Math.random() * cs.length)]).join("");
}

const people = [
  { uid: "admin-test", displayName: "แอดมินทดสอบ", role: "admin", email: "admin@test.local" },
  { uid: "player-somchai", displayName: "สมชาย", role: "player", email: "somchai@test.local" },
  { uid: "player-somsak", displayName: "สมศักดิ์", role: "player", email: "somsak@test.local" },
  { uid: "player-somying", displayName: "สมหญิง", role: "player", email: "somying@test.local" },
];

async function run() {
  console.log("Project:", PROJECT_ID, "(emulator)");

  // ผู้ใช้ใน Auth emulator + โปรไฟล์ใน Firestore
  for (const p of people) {
    await auth.createUser({ uid: p.uid, email: p.email, password: "test1234", displayName: p.displayName })
      .catch((e) => { if (e.code !== "auth/uid-already-exists") throw e; });
    await db.collection("users").doc(p.uid).set({
      displayName: p.displayName, role: p.role, phone: "0800000000",
      facebookName: p.displayName, facebookUrl: null, lineId: null, photoURL: null,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  const playerIds = ["player-somchai", "player-somsak", "player-somying"];

  // ลีคเก็บแต้ม กำลังแข่ง
  const leagueRef = db.collection("leagues").doc("test-points-league");
  await leagueRef.set({
    name: "ลีคทดสอบเก็บแต้ม", format: "points", matchType: "single", size: 3,
    status: "ongoing", playerIds, currentRound: null, imageURL: null,
    createdAt: FieldValue.serverTimestamp(), createdBy: "admin-test",
    startedAt: FieldValue.serverTimestamp(), finishedAt: null,
  });

  function baseMatch(extra) {
    return {
      leagueId: leagueRef.id, kind: "regular", round: null, slot: null, leg: null,
      matchCode: code(), status: "scheduled", submissions: {}, submissionHistory: [],
      approvedResult: null, walkover: null, contactUnreachable: {}, hasContactIssue: false,
      createdAt: FieldValue.serverTimestamp(), ...extra,
    };
  }

  // ลบแมตช์เก่าของลีคทดสอบก่อน (idempotent)
  const old = await db.collection("matches").where("leagueId", "==", leagueRef.id).get();
  await Promise.all(old.docs.map((d) => d.ref.delete()));

  // สมชาย vs สมศักดิ์ — ผลจริง เสมอ 1-1 (ไว้พิสูจน์ unban ไม่ทำผลจริงหาย)
  await db.collection("matches").add(baseMatch({
    players: { home: "player-somchai", away: "player-somsak" },
    status: "approved",
    approvedResult: { scoreHome: 1, scoreAway: 1, penaltyHome: null, penaltyAway: null,
      decidedBy: "auto", decidedAt: FieldValue.serverTimestamp(), adminChoiceUid: null, isReplay: false },
  }));
  // สมชาย vs สมหญิง — ยังไม่แข่ง (ไว้เทสต์บั๊ก 1: แอดมินตัดสินเสมอ / บั๊ก 2: ล็อกตอนแบน)
  await db.collection("matches").add(baseMatch({ players: { home: "player-somchai", away: "player-somying" } }));
  // สมศักดิ์ vs สมหญิง — ยังไม่แข่ง
  await db.collection("matches").add(baseMatch({ players: { home: "player-somsak", away: "player-somying" } }));

  console.log("✅ Seed เสร็จ: ลีค 'ลีคทดสอบเก็บแต้ม', ผู้เล่น 3 คน, แมตช์ 3 นัด (เสมอจริง 1 นัด)");
  console.log("   ล็อกอิน emulator ด้วยอีเมล/รหัส: admin@test.local / test1234 (และ somchai/somsak/somying)");
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
