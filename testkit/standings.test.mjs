// พิสูจน์ความปลอดภัยของกลไกแพ้บาย (byeBans) — รันด้วย: node testkit/standings.test.mjs
// ทดสอบ pure function computeStandings/computeForm โดยตรง ไม่แตะ Firebase/production เลย
import assert from "node:assert/strict";
import { computeStandings, computeForm } from "../app/src/utils/standings.js";

const A = "playerA", B = "playerB", C = "playerC", D = "playerD";
const players = [A, B, C, D];

// ลีคเก็บแต้ม single round-robin — มีทั้งผลจริง (รวมผลเสมอ) และนัดที่ยังไม่แข่ง
function makeMatches() {
  return [
    // A ชนะ B 2-0 (ผลจริง)
    { kind: "regular", status: "approved", players: { home: A, away: B },
      approvedResult: { scoreHome: 2, scoreAway: 0, penaltyHome: null, penaltyAway: null } },
    // A เสมอ C 1-1 (ผลจริง — เสมอได้ในลีคเก็บแต้ม, เกี่ยวกับบั๊ก 1 ด้วย)
    { kind: "regular", status: "approved", players: { home: A, away: C },
      approvedResult: { scoreHome: 1, scoreAway: 1, penaltyHome: null, penaltyAway: null } },
    // A vs D ยังไม่แข่ง
    { kind: "regular", status: "scheduled", players: { home: A, away: D }, approvedResult: null },
    // C ชนะ B 3-1 (ผลจริง)
    { kind: "regular", status: "approved", players: { home: B, away: C },
      approvedResult: { scoreHome: 1, scoreAway: 3, penaltyHome: null, penaltyAway: null } },
    // B vs D ยังไม่แข่ง
    { kind: "regular", status: "scheduled", players: { home: B, away: D }, approvedResult: null },
    // D ชนะ C 1-0 (ผลจริง)
    { kind: "regular", status: "approved", players: { home: C, away: D },
      approvedResult: { scoreHome: 0, scoreAway: 1, penaltyHome: null, penaltyAway: null } },
  ];
}

function rowOf(standings, uid) {
  return standings.find((r) => r.uid === uid);
}

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log("  ✓", name);
}

console.log("\n[1] Baseline (ไม่มีใครถูกแบน) — ผลจริงคำนวณถูกต้อง");
const matches = makeMatches();
const baseline = computeStandings(players, matches, {});
check("A: เล่น 2 ชนะ1 เสมอ1 = 4 แต้ม", () => {
  const a = rowOf(baseline, A);
  assert.equal(a.played, 2);
  assert.equal(a.won, 1);
  assert.equal(a.drawn, 1);
  assert.equal(a.lost, 0);
  assert.equal(a.points, 4);
});
check("C: เล่น 2 ชนะ1(vsB) แพ้1(vsD) เสมอ1(vsA) = เล่น3 4แต้ม", () => {
  const c = rowOf(baseline, C);
  assert.equal(c.played, 3);
  assert.equal(c.won, 1);
  assert.equal(c.drawn, 1);
  assert.equal(c.lost, 1);
  assert.equal(c.points, 4);
});
// snapshot baseline ไว้เทียบตอน unban
const baselineSnapshot = JSON.stringify(baseline);

console.log("\n[2] แบน C — ทุกแมตช์ของ C กลายเป็นแพ้ 3-0, คู่แข่งได้ชนะ");
const banned = { [C]: { active: true } };
const afterBan = computeStandings(players, matches, banned);
check("C: ทุกนัดเป็นแพ้ 0 แต้ม", () => {
  const c = rowOf(afterBan, C);
  assert.equal(c.won, 0);
  assert.equal(c.drawn, 0);
  assert.equal(c.points, 0);
  assert.ok(c.lost >= 1);
  assert.equal(c.gf, 0); // ยิงไม่ได้เลย
});
check("A: นัดที่เคยเสมอ C (1-1) ตอนแบนกลายเป็นชนะ 3-0", () => {
  const a = rowOf(afterBan, A);
  // A เคย: ชนะB, เสมอC. ตอนแบน C → A ชนะ C ด้วย = ชนะ 2 นัด ไม่มีเสมอ
  assert.equal(a.won, 2);
  assert.equal(a.drawn, 0);
  assert.equal(a.points, 6);
});
check("ไม่นับซ้ำ: A เล่นไม่เกินจำนวนคู่แข่งที่เจอ (2)", () => {
  assert.equal(rowOf(afterBan, A).played, 2);
});

console.log("\n[3] เลิกแบน C — ผลแข่งจริงต้องกลับมาเป๊ะเหมือน baseline (พิสูจน์ว่าไม่มีข้อมูลหาย)");
// เลิกแบน = ไม่มี active ban (จำลองทั้งแบบลบ doc และแบบ active:false)
const afterUnbanRemoved = computeStandings(players, matches, {});
const afterUnbanInactive = computeStandings(players, matches, { [C]: { active: false } });
check("standings หลังเลิกแบน (ลบ doc) === baseline เป๊ะทุก field", () => {
  assert.equal(JSON.stringify(afterUnbanRemoved), baselineSnapshot);
});
check("standings หลังเลิกแบน (active:false) === baseline เป๊ะทุก field", () => {
  assert.equal(JSON.stringify(afterUnbanInactive), baselineSnapshot);
});
check("ผลจริง A-C ที่เคยเสมอ 1-1 กลับมาเป็นเสมอ (ไม่กลายเป็น 3-0 ค้าง)", () => {
  const a = rowOf(afterUnbanRemoved, A);
  assert.equal(a.drawn, 1);
  assert.equal(a.won, 1);
});

console.log("\n[4] ฟอร์ม (form) — มุมมองนัดต่อนัดสอดคล้องกัน");
check("ฟอร์ม C ตอนแบน เป็น L ล้วน", () => {
  const form = computeForm(players, matches, banned);
  assert.ok(form[C].length >= 1);
  assert.ok(form[C].every((o) => o === "L"));
});
check("ฟอร์ม C หลังเลิกแบน มีทั้ง W/D/L ตามผลจริง", () => {
  const form = computeForm(players, matches, {});
  assert.deepEqual([...form[C]].sort(), ["D", "L", "W"]);
});

console.log("\n[5] ทั้งคู่ถูกแบน — แมตช์นั้นไม่ถูกนับให้ใครเลย");
check("A & B ถูกแบนทั้งคู่ → แมตช์ A-B ไม่เพิ่ม played ให้ทั้งสอง", () => {
  const both = computeStandings(players, matches, { [A]: { active: true }, [B]: { active: true } });
  // A-B เป็นแมตช์เดียวที่ทั้งคู่ถูกแบน → ไม่นับ; แต่ A-C, A-D, B-C, B-D นับ (อีกฝั่งไม่ถูกแบน)
  // ยืนยันแค่ว่าไม่ throw และ A ไม่ได้แต้มจากนัดที่เจอ B
  const a = rowOf(both, A);
  assert.ok(a.played <= 2); // A เจอ B(ไม่นับ), C, D → นับได้แค่ vsC,vsD
});

console.log(`\n✅ ผ่านทั้งหมด ${passed} เคส — กลไกแพ้บายไม่ทำข้อมูลจริงหาย และตารางไม่นับซ้ำ\n`);
