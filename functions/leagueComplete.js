// ตรรกะ "ลีคเก็บแต้มแข่งจบครบหรือยัง" — แยกเป็นโมดูลบริสุทธิ์ (ไม่มี firebase) เพื่อ unit test ได้
// ใช้เกณฑ์เดียวกับตารางคะแนน: นัดที่มีคนแพ้บายถือว่า "จบ" แม้ match doc ยังไม่ถูกแก้

// นัดปกติจบเมื่อ อนุมัติ/ชนะบาย หรือมีฝ่ายใดถูกแพ้บาย (byeBan active)
// นัดตัดสิน (tiebreaker) จบเมื่อ อนุมัติ/ชนะบาย เท่านั้น (ไม่มีแพ้บายในนัดตัดสิน)
function isMatchSettled(m, byeBans = {}) {
  if (m.status === "approved" || m.status === "walkover") return true;
  if (m.kind === "regular") {
    return !!(byeBans[m.players.home]?.active || byeBans[m.players.away]?.active);
  }
  return false;
}

// ลีคเก็บแต้มจบเมื่อ "มีตารางแข่งแล้ว" และทุกแมตช์ (นัดปกติ + นัดตัดสิน) จบหมด
function isPointsLeagueComplete(matches, byeBans = {}) {
  const relevant = matches.filter((m) => m.kind === "regular" || m.kind === "tiebreaker");
  if (relevant.length === 0) return false;
  return relevant.every((m) => isMatchSettled(m, byeBans));
}

module.exports = { isPointsLeagueComplete, isMatchSettled };
