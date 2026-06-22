// ตั้งชื่อรอบตามจำนวนทีมที่เหลือในรอบนั้น (ไม่ใช่เลขรอบดิบ) ใช้ร่วมกันทุกที่ที่โชว์ชื่อรอบให้ผู้เล่นเห็น
// bracketSize = จำนวนผู้เล่นทั้งหมดตอนเริ่มถ้วย (league.size), round = ลำดับรอบ (1, 2, 3, ...)
export function roundLabel(bracketSize, round) {
  if (bracketSize == null || round == null) return `รอบ ${round}`;
  const teams = bracketSize / Math.pow(2, round - 1);
  if (teams <= 2) return "รอบชิงชนะเลิศ";
  return `รอบ ${teams} ทีม`;
}
