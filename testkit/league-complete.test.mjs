// ทดสอบเงื่อนไขปิดลีคเก็บแต้มอัตโนมัติ — รัน: node testkit/league-complete.test.mjs
import assert from "node:assert/strict";
import pkg from "../functions/leagueComplete.js";
const { isPointsLeagueComplete } = pkg;

const A = "a", B = "b", C = "c";
const reg = (home, away, status = "scheduled") => ({ kind: "regular", status, players: { home, away } });
const tb = (home, away, status = "scheduled") => ({ kind: "tiebreaker", status, players: { home, away } });

let passed = 0;
const ok = (n) => { passed++; console.log("  ✓", n); };

console.log("\n[ลีคเก็บแต้ม auto-finish]");

ok("ยังไม่มีตารางแข่ง → ยังไม่จบ");
assert.equal(isPointsLeagueComplete([], {}), false);

ok("มีนัดยังไม่แข่ง → ยังไม่จบ");
assert.equal(isPointsLeagueComplete([reg(A, B, "approved"), reg(A, C, "scheduled")], {}), false);

ok("ทุกนัดอนุมัติแล้ว → จบ");
assert.equal(isPointsLeagueComplete([reg(A, B, "approved"), reg(A, C, "walkover")], {}), true);

ok("นัดสุดท้ายยังไม่แข่ง แต่ฝ่ายหนึ่งถูกแพ้บาย → จบ (มองทะลุเหมือนตาราง)");
assert.equal(
  isPointsLeagueComplete([reg(A, B, "approved"), reg(A, C, "scheduled")], { [C]: { active: true } }),
  true
);

ok("แพ้บายแบบ active:false (เลิกแบนแล้ว) ไม่นับว่าจบ");
assert.equal(
  isPointsLeagueComplete([reg(A, B, "approved"), reg(A, C, "scheduled")], { [C]: { active: false } }),
  false
);

ok("มีนัดตัดสิน (tiebreaker) ที่ยังไม่จบ → ยังไม่จบ แม้นัดปกติครบ");
assert.equal(
  isPointsLeagueComplete([reg(A, B, "approved"), reg(A, C, "approved"), tb(A, B, "scheduled")], {}),
  false
);

ok("นัดตัดสินอนุมัติแล้วด้วย → จบ");
assert.equal(
  isPointsLeagueComplete([reg(A, B, "approved"), reg(A, C, "approved"), tb(A, B, "approved")], {}),
  true
);

ok("นัดตัดสินไม่นับแพ้บาย (ต้องเล่นจริงเท่านั้น)");
assert.equal(
  isPointsLeagueComplete([reg(A, B, "approved"), tb(A, C, "scheduled")], { [C]: { active: true } }),
  false
);

console.log(`\n✅ ผ่านทั้งหมด ${passed} เคส\n`);
