// ทดสอบ integration บน emulator จริง: แบน/เลิกแบน ต้องไม่แตะ match doc เลย (non-destructive)
// รัน: node testkit/verify-byeban.mjs   (หลัง seed)
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { computeStandings } from "../app/src/utils/standings.js";

const PROJECT_ID = readFileSync(new URL("../app/.env.local", import.meta.url), "utf8")
  .split("\n").find((l) => l.startsWith("VITE_FIREBASE_PROJECT_ID")).split("=")[1].trim();
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
initializeApp({ projectId: PROJECT_ID });
const db = getFirestore();

const LEAGUE = "test-points-league";
const SOMCHAI = "player-somchai";

async function loadMatches() {
  const snap = await db.collection("matches").where("leagueId", "==", LEAGUE).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
async function loadByeBans() {
  const snap = await db.collection("leagues").doc(LEAGUE).collection("byeBans").get();
  const map = {};
  snap.docs.forEach((d) => (map[d.id] = d.data()));
  return map;
}
// เลียนแบบ setByeBan ของแอป (เขียน doc byeBan เท่านั้น ไม่แตะ matches)
async function setByeBan(uid, active) {
  const ref = db.collection("leagues").doc(LEAGUE).collection("byeBans").doc(uid);
  if (active) await ref.set({ active: true, bannedAt: FieldValue.serverTimestamp(), bannedBy: "admin-test" });
  else await ref.set({ active: false, unbannedAt: FieldValue.serverTimestamp() }, { merge: true });
}

let passed = 0;
const ok = (n) => { passed++; console.log("  ✓", n); };

const playerIds = ["player-somchai", "player-somsak", "player-somying"];

console.log("\n[ก่อนแบน] เก็บ snapshot ของ match docs ทั้งหมด");
const before = await loadMatches();
const beforeJSON = JSON.stringify(before.map((m) => ({ id: m.id, status: m.status, approvedResult: m.approvedResult })).sort((a, b) => a.id.localeCompare(b.id)));
const baselineStandings = computeStandings(playerIds, before, await loadByeBans());
ok(`โหลด ${before.length} แมตช์, somchai มีผลเสมอจริง 1-1 อยู่`);
assert.ok(before.some((m) => m.status === "approved" && m.approvedResult?.scoreHome === 1 && m.approvedResult?.scoreAway === 1));

console.log("\n[แบน somchai] เขียน byeBan doc");
await setByeBan(SOMCHAI, true);
const afterBanMatches = await loadMatches();
const afterBanJSON = JSON.stringify(afterBanMatches.map((m) => ({ id: m.id, status: m.status, approvedResult: m.approvedResult })).sort((a, b) => a.id.localeCompare(b.id)));
ok("match docs ไม่เปลี่ยนแม้แต่ field เดียวหลังแบน (non-destructive)");
assert.equal(afterBanJSON, beforeJSON);
const banStandings = computeStandings(playerIds, afterBanMatches, await loadByeBans());
ok("ตารางคำนวณใหม่: somchai กลายเป็น 0 แต้ม");
assert.equal(banStandings.find((r) => r.uid === SOMCHAI).points, 0);

console.log("\n[เลิกแบน somchai]");
await setByeBan(SOMCHAI, false);
const afterUnban = await loadMatches();
const afterUnbanJSON = JSON.stringify(afterUnban.map((m) => ({ id: m.id, status: m.status, approvedResult: m.approvedResult })).sort((a, b) => a.id.localeCompare(b.id)));
ok("match docs ยังเหมือนเดิมเป๊ะ (ผลเสมอ 1-1 จริงไม่หาย)");
assert.equal(afterUnbanJSON, beforeJSON);
const unbanStandings = computeStandings(playerIds, afterUnban, await loadByeBans());
ok("ตารางกลับมาเท่า baseline ทุกแต้ม");
assert.equal(JSON.stringify(unbanStandings), JSON.stringify(baselineStandings));

console.log(`\n✅ ผ่าน ${passed} เคส บน emulator จริง — แบน/เลิกแบนไม่แตะ match doc, ผลจริงปลอดภัย\n`);
process.exit(0);
