// คำนวณตำแหน่ง (x, y) ของทุกโหนด/จุดบรรจบในสายถ้วยล้วน ๆ ด้วยสูตรคณิตศาสตร์ตรง ๆ — ไม่วัด DOM เลย
// หลักการ: รอบแรกสุด (นอกสุด) เรียงห่างเท่ากัน, รอบถัดไป Y ของโหนด = ค่าเฉลี่ย Y ของคู่รอบก่อนหน้าที่ป้อนเข้ามา
// ทำให้จุดบรรจบอยู่กึ่งกลางพอดีเสมอ เส้นเชื่อมเป็นเส้นตรง/ฉากไม่มีวกไปวกมา (ไม่แตะ logic การจับคู่/คำนวณผลใด ๆ)

export const NODE_SPACING = 96; // ระยะห่างแนวตั้งระหว่างโหนดติดกันในรอบนอกสุด (รอบ 1)
export const COLUMN_SPACING = 130; // ระยะห่างแนวนอน "ออกจากรอบนอกสุด" (รอบแรก) เท่านั้น — ช่วงถัดไปทั้งหมดสั้นลงครึ่งหนึ่ง (ดู HALF_COLUMN_SPACING)
const HALF_COLUMN_SPACING = COLUMN_SPACING / 2; // ระยะห่างแนวนอนของทุกช่วงที่ไม่ใช่ "ออกจากรอบแรก" (รอบ 8 ออกไปรอบ 4, รอบ 4 ออกไปรอบชิง ฯลฯ) — ผู้ใช้ขอให้สั้นลงครึ่งนึง
export const NODE_RADIUS = 20;
export const EDGE_PADDING = 28; // กันโหนดคอลัมน์ซ้ายสุด/ขวาสุดโดนตัดครึ่งวง — ศูนย์กลางโหนดต้องไม่ชนขอบผ้าใบเป๊ะ
// แยกสองค่านี้ออกจากกัน — เดิมใช้ค่าเดียว (FINAL_GAP) ทั้งคู่ ทำให้ผู้เล่นนัดชิงสองคนห่างกันแค่ NODE_RADIUS*2 (~40px) ติดกันเกินไป
const SEMI_TO_FINAL_GAP = HALF_COLUMN_SPACING; // ออกจากรอบรองสุดท้าย (ไม่ใช่รอบแรก) จึงสั้นลงครึ่งเช่นกัน
const FINALIST_GAP = 150; // ระยะระหว่างผู้เล่นนัดชิงสองคน (ให้ถ้วย+มงกุฎมีที่อยู่ตรงกลางพอดี ไม่ดูอัดกัน)

// คืนระยะสะสม (x แบบ relative เริ่มที่ 0) ของแต่ละคอลัมน์ในฝั่งเดียว — ช่วงแรก (ออกจากรอบนอกสุด) เต็ม ช่วงต่อจากนั้นสั้นลงครึ่ง
function cumulativeColumnOffsets(colCount) {
  const offsets = [0];
  for (let i = 1; i < colCount; i++) {
    const gap = i === 1 ? COLUMN_SPACING : HALF_COLUMN_SPACING;
    offsets.push(offsets[i - 1] + gap);
  }
  return offsets;
}

// rounds ต้องเรียงจากรอบนอกสุด (มากทีมสุด) ไปรอบในสุดก่อนรอบชิง — คืน nodeY คีย์ "${round}-${slot}-${home|away}"
function computeSideYPositions(rounds) {
  const nodeY = {};
  const slotCenterY = {};
  if (rounds.length === 0) return { nodeY, slotCenterY, totalHeight: 0 };

  // ใช้ลำดับตำแหน่งในอาเรย์ (i) เป็นแนวตั้งจริง แต่คีย์ต้องใช้ slot.slot จริง (ฝั่งขวา slot ไม่เริ่มที่ 0 — index ในอาเรย์ ≠ slot number)
  const firstRound = rounds[0];
  firstRound.slots.forEach((slot, i) => {
    const homeY = 2 * i * NODE_SPACING;
    const awayY = (2 * i + 1) * NODE_SPACING;
    nodeY[`${firstRound.round}-${slot.slot}-home`] = homeY;
    nodeY[`${firstRound.round}-${slot.slot}-away`] = awayY;
    slotCenterY[`${firstRound.round}-${slot.slot}`] = (homeY + awayY) / 2;
  });

  for (let i = 1; i < rounds.length; i++) {
    const round = rounds[i];
    const prevRound = rounds[i - 1];
    for (const slot of round.slots) {
      const homeY = slotCenterY[`${prevRound.round}-${slot.slot * 2}`];
      const awayY = slotCenterY[`${prevRound.round}-${slot.slot * 2 + 1}`];
      nodeY[`${round.round}-${slot.slot}-home`] = homeY;
      nodeY[`${round.round}-${slot.slot}-away`] = awayY;
      slotCenterY[`${round.round}-${slot.slot}`] = (homeY + awayY) / 2;
    }
  }

  const totalHeight = (firstRound.slots.length * 2 - 1) * NODE_SPACING;
  return { nodeY, slotCenterY, totalHeight };
}

// layout มาจาก computeBracketLayout (leftRounds/rightRounds/finalSlot/totalRounds)
// คืนตำแหน่งทุกโหนดเป็นพิกัดเดียวกันทั้งภาพ (global) + ขนาดผ้าใบรวม ไว้ใช้ทั้งวาง node และวาดเส้น SVG
export function computeBracketGeometry(layout) {
  const { leftRounds, rightRounds, finalSlot, totalRounds } = layout;
  const rightRoundsOutermostFirst = [...rightRounds].reverse();

  const left = computeSideYPositions(leftRounds);
  const right = computeSideYPositions(rightRoundsOutermostFirst);

  const totalHeight = Math.max(left.totalHeight, right.totalHeight, NODE_SPACING);
  const centerY = totalHeight / 2;

  // เลื่อนแต่ละฝั่งให้กึ่งกลางตรงกันที่ centerY (เผื่อสองฝั่งจำนวนทีมไม่เท่ากัน แม้ปกติเท่ากันเสมอ)
  function shiftToCenter(side) {
    const sideCenterY = side.totalHeight / 2;
    const offset = centerY - sideCenterY;
    const shifted = {};
    for (const [k, v] of Object.entries(side.nodeY)) shifted[k] = v + offset;
    const shiftedCenters = {};
    for (const [k, v] of Object.entries(side.slotCenterY)) shiftedCenters[k] = v + offset;
    return { nodeY: shifted, slotCenterY: shiftedCenters };
  }
  const leftShifted = shiftToCenter(left);
  const rightShifted = shiftToCenter(right);

  const leftColCount = leftRounds.length;
  const rightColCount = rightRounds.length;
  const leftOffsets = cumulativeColumnOffsets(leftColCount);
  const rightOffsets = cumulativeColumnOffsets(rightColCount);
  const leftWidth = leftOffsets[leftColCount - 1] ?? 0;
  const rightWidth = rightOffsets[rightColCount - 1] ?? 0;
  const centerWidth = SEMI_TO_FINAL_GAP * 2 + FINALIST_GAP;
  // เผื่อ EDGE_PADDING ทั้งสองข้าง กันโหนดคอลัมน์นอกสุดโดนตัดครึ่งวง (ศูนย์กลางโหนดอยู่ที่ขอบเป๊ะไม่ได้ ต้องมีที่ให้อีกครึ่งวงด้วย)
  const innerWidth = leftWidth + centerWidth + rightWidth;
  const totalWidth = innerWidth + EDGE_PADDING * 2;

  const positions = {}; // key: "${round}-${slot}-${home|away}" -> {x, y} (รวม final ด้วยคีย์ round นั้น slot 0)

  leftRounds.forEach((r, colIdx) => {
    const x = EDGE_PADDING + leftOffsets[colIdx];
    for (const slot of r.slots) {
      positions[`${r.round}-${slot.slot}-home`] = { x, y: leftShifted.nodeY[`${r.round}-${slot.slot}-home`] };
      positions[`${r.round}-${slot.slot}-away`] = { x, y: leftShifted.nodeY[`${r.round}-${slot.slot}-away`] };
    }
  });

  rightRounds.forEach((r, colIdxFromCenter) => {
    // rightRounds เรียงในสุดไปนอกสุด (ดูคอมเมนต์ computeBracketLayout) — col นับจากนอกสุดของฝั่งขวา
    const colIdxFromOutermost = rightColCount - 1 - colIdxFromCenter;
    const x = totalWidth - EDGE_PADDING - rightOffsets[colIdxFromOutermost];
    for (const slot of r.slots) {
      positions[`${r.round}-${slot.slot}-home`] = { x, y: rightShifted.nodeY[`${r.round}-${slot.slot}-home`] };
      positions[`${r.round}-${slot.slot}-away`] = { x, y: rightShifted.nodeY[`${r.round}-${slot.slot}-away`] };
    }
  });

  if (finalSlot) {
    const homeX = EDGE_PADDING + leftWidth + SEMI_TO_FINAL_GAP;
    const awayX = homeX + FINALIST_GAP;
    positions[`${finalSlot.round}-0-home`] = { x: homeX, y: centerY };
    positions[`${finalSlot.round}-0-away`] = { x: awayX, y: centerY };
  }

  const trophyPos = { x: totalWidth / 2, y: centerY };

  return { positions, totalWidth, totalHeight, centerY, leftWidth, rightWidth, trophyPos, totalRounds };
}
