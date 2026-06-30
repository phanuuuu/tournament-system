// ทดสอบ auto-finish ลีคเก็บแต้มบน emulator จริง (มี functions emulator ทำงาน)
// รัน: node testkit/verify-autofinish.mjs   (หลัง seed + emulator --only auth,firestore,functions)
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const PROJECT_ID = readFileSync(new URL("../app/.env.local", import.meta.url), "utf8")
  .split("\n").find((l) => l.startsWith("VITE_FIREBASE_PROJECT_ID")).split("=")[1].trim();
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
initializeApp({ projectId: PROJECT_ID });
const db = getFirestore();

const LEAGUE = "test-points-league";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function leagueStatus() {
  return (await db.doc(`leagues/${LEAGUE}`).get()).data().status;
}
async function matchesOf() {
  const s = await db.collection("matches").where("leagueId", "==", LEAGUE).get();
  return s.docs.map((d) => ({ id: d.id, ...d.data() }));
}
async function approveMatch(id, sh, sa) {
  await db.doc(`matches/${id}`).update({
    status: "approved",
    approvedResult: { scoreHome: sh, scoreAway: sa, penaltyHome: null, penaltyAway: null,
      decidedBy: "admin", decidedAt: FieldValue.serverTimestamp(), adminChoiceUid: null, isReplay: false },
  });
}
async function setByeBan(uid, active) {
  const ref = db.doc(`leagues/${LEAGUE}/byeBans/${uid}`);
  if (active) await ref.set({ active: true, bannedAt: FieldValue.serverTimestamp(), bannedBy: "admin-test" });
  else await ref.set({ active: false, unbannedAt: FieldValue.serverTimestamp() }, { merge: true });
}
async function waitForStatus(want, timeoutMs = 12000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if ((await leagueStatus()) === want) return true;
    await sleep(400);
  }
  return false;
}
async function resetOngoing() {
  await db.doc(`leagues/${LEAGUE}`).update({ status: "ongoing", finishedAt: null });
}

let passed = 0;
const ok = (n) => { passed++; console.log("  ✓", n); };

console.log("\n[1] Auto-finish เมื่อแมตช์อนุมัติครบทุกนัด");
let ms = await matchesOf();
const scheduled = ms.filter((m) => m.status === "scheduled");
console.log(`   สถานะเริ่มต้น: ${await leagueStatus()}, นัดที่ยังไม่แข่ง ${scheduled.length}`);
assert.equal(await leagueStatus(), "ongoing");
await approveMatch(scheduled[0].id, 2, 1);
await sleep(800);
ok(`อนุมัติไป 1 นัด เหลืออีก ${scheduled.length - 1} → ลีคยังไม่ปิด (${await leagueStatus()})`);
assert.equal(await leagueStatus(), "ongoing");
await approveMatch(scheduled[1].id, 0, 0);
const finished1 = await waitForStatus("finished");
ok("อนุมัตินัดสุดท้าย → onPointsMatchSettled ยิง → ลีคปิดอัตโนมัติ (finished)");
assert.equal(finished1, true);
assert.ok((await db.doc(`leagues/${LEAGUE}`).get()).data().finishedAt, "ตั้ง finishedAt ด้วย");

console.log("\n[2] Auto-finish เมื่อแบนคนสุดท้าย (ไม่มี match doc อัปเดต)");
// reseed สถานะ: ปลดล็อกลีค + ตั้งนัดหนึ่งกลับเป็น scheduled ให้ยังไม่ครบ
await resetOngoing();
ms = await matchesOf();
const oneApproved = ms.find((m) => m.status === "approved");
await db.doc(`matches/${oneApproved.id}`).update({ status: "scheduled", approvedResult: null });
await sleep(800);
await resetOngoing(); // เผื่อ trigger เด้งระหว่างแก้
console.log(`   สถานะ: ${await leagueStatus()} (มี 1 นัดยังไม่แข่ง)`);
assert.equal(await leagueStatus(), "ongoing");
// แบนผู้เล่นที่อยู่ในนัดที่ยังไม่แข่ง → ทำให้ครบ
ms = await matchesOf();
const stillScheduled = ms.find((m) => m.status === "scheduled");
const banTarget = stillScheduled.players.home;
console.log(`   แบน ${banTarget} (อยู่ในนัดที่ค้าง)`);
await setByeBan(banTarget, true);
const finished2 = await waitForStatus("finished");
ok("แบนคนสุดท้าย → onByeBanWrite ยิง → ลีคปิดอัตโนมัติ (finished)");
assert.equal(finished2, true);

console.log("\n[3] เลิกแบนหลังปิด → ไม่ auto-reopen (แอดมินเปิดเอง)");
await setByeBan(banTarget, false);
await sleep(2000);
ok("เลิกแบนแล้วลีคยังคง finished (ไม่เด้งกลับเอง)");
assert.equal(await leagueStatus(), "finished");

console.log(`\n✅ ผ่าน ${passed} เคส บน emulator จริง — auto-finish ทำงานทั้งทางแมตช์และทางแพ้บาย\n`);
process.exit(0);
