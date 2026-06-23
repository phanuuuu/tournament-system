// คำนวณ "โครงสาย" ถ้วยแบบ UCL (สองสายซ้าย-ขวาวิ่งเข้าหารอบชิงกลางจอ) ล้วน ๆ เพื่อแสดงผล
// ไม่แตะตรรกะการจับคู่/เลื่อนรอบ/คำนวณผลใด ๆ — แค่อ่าน matches ที่มีอยู่แล้วมาจัดเป็นโครงรอบ + หาผู้ชนะแต่ละคู่
// (กติกาผู้ชนะ logic เดียวกับ BracketView เดิม/Cloud Function onMatchApproved/getCupStatus เป๊ะ ๆ)

export function winnerUidOf(m) {
  if (m.status === "walkover") return m.walkover.winnerUid;
  if (m.status !== "approved") return null;
  const { scoreHome, scoreAway, penaltyHome, penaltyAway } = m.approvedResult;
  if (scoreHome !== scoreAway) return scoreHome > scoreAway ? m.players.home : m.players.away;
  if (penaltyHome != null) return penaltyHome > penaltyAway ? m.players.home : m.players.away;
  return null;
}

export function isSettled(status) {
  return status === "approved" || status === "walkover";
}

// ผลของแต่ละฝั่ง ("3 (4)" ถ้ามีจุดโทษ, "-" ถ้ายังไม่จบ, null ถ้าชนะบาย)
export function scoreLabel(side, m) {
  if (m.status === "walkover") return null;
  if (m.status !== "approved") return "-";
  const score = side === "home" ? m.approvedResult.scoreHome : m.approvedResult.scoreAway;
  const penalty = side === "home" ? m.approvedResult.penaltyHome : m.approvedResult.penaltyAway;
  return penalty != null ? `${score} (${penalty})` : `${score}`;
}

// bracketSize เป็นเลขยกกำลังสองเสมอ (บังคับโดย isValidCupSize ตอนสร้างลีค) — totalRounds = log2(bracketSize)
export function computeBracketLayout(matches, bracketSize) {
  const totalRounds = Math.round(Math.log2(bracketSize));
  const byRoundSlot = {};
  for (const m of matches) {
    if (m.kind !== "regular" || m.round == null) continue;
    byRoundSlot[m.round] = byRoundSlot[m.round] ?? {};
    byRoundSlot[m.round][m.slot] = m;
  }

  // โครงรอบเต็มตามขนาดสาย ไม่ใช่แค่รอบที่มีแมตช์จริงแล้ว (รอบที่ยังไม่เกิดขึ้น = ช่องว่าง placeholder)
  const roundsSkeleton = [];
  for (let round = 1; round <= totalRounds; round++) {
    const slotCount = bracketSize / Math.pow(2, round);
    const slots = [];
    for (let slot = 0; slot < slotCount; slot++) {
      slots.push({ round, slot, match: byRoundSlot[round]?.[slot] ?? null });
    }
    roundsSkeleton.push({ round, slots });
  }

  const finalRound = roundsSkeleton[totalRounds - 1];
  const finalMatch = finalRound?.slots[0]?.match ?? null;
  const championUid = finalMatch && isSettled(finalMatch.status) ? winnerUidOf(finalMatch) : null;

  // รอบก่อนรอบชิง แบ่งครึ่งซ้าย-ขวาตาม slot (สอดคล้องกับการจับคู่ผู้ชนะขึ้นรอบของ onMatchApproved:
  // round N slot s ผ่านเข้า round N+1 slot floor(s/2) ฝั่ง home ถ้า s คู่ ฝั่ง away ถ้า s คี่)
  const sideRounds = roundsSkeleton.slice(0, totalRounds - 1);
  const leftRounds = sideRounds.map((r) => ({ ...r, slots: r.slots.slice(0, r.slots.length / 2) }));
  const rightRounds = sideRounds
    .map((r) => ({ ...r, slots: r.slots.slice(r.slots.length / 2) }))
    .slice()
    .reverse();

  return { totalRounds, roundsSkeleton, leftRounds, rightRounds, finalSlot: finalRound?.slots[0], championUid };
}

// ลำดับรอบที่ผู้เล่นคนนี้ผ่านมา (เรียงตามรอบ) ใช้ทำเส้นทางวิ่งของแต่ละทีมในแอนิเมชัน
export function teamMatchSequence(matches, uid) {
  return matches
    .filter((m) => m.kind === "regular" && m.round != null && (m.players.home === uid || m.players.away === uid))
    .sort((a, b) => a.round - b.round);
}

// เส้นทางของทุกทีมที่เคยลงแข่ง — แต่ละเส้นทางคือลำดับ "ช่วงเชื่อม" ระหว่างรอบที่ทีมนั้นชนะมา
// วิ่งได้ไกลแค่ไหนก็แค่นั้นจริง ๆ (ตกรอบไหน/ยังไม่รู้ผลรอบไหน ก็หยุดที่รอบนั้น) แชมป์เท่านั้นที่มีช่วงเชื่อมพิเศษไปถ้วย
// group = เลขรอบต้นทางของช่วงเชื่อมนั้น (ใช้ทำ stagger เรียงทีละรอบ), ช่วงเชื่อมไปถ้วย group = totalRounds (รอบสุดท้าย)
export function computeTeamPaths(matches, bracketSize, championUid) {
  const totalRounds = Math.round(Math.log2(bracketSize));
  const uids = new Set();
  for (const m of matches) {
    if (m.kind !== "regular" || m.round == null) continue;
    uids.add(m.players.home);
    uids.add(m.players.away);
  }

  const paths = [];
  for (const uid of uids) {
    const seq = teamMatchSequence(matches, uid);
    if (seq.length === 0) continue;
    const segments = [];
    for (let i = 0; i < seq.length - 1; i++) {
      segments.push({ fromRound: seq[i].round, toRound: seq[i + 1].round, group: seq[i].round });
    }
    const last = seq[seq.length - 1];
    const isChampion =
      championUid === uid && last.round === totalRounds && isSettled(last.status) && winnerUidOf(last) === uid;
    if (isChampion) {
      segments.push({ fromRound: last.round, toRound: "trophy", group: totalRounds });
    }
    if (segments.length > 0) paths.push({ uid, segments, isChampion });
  }
  return paths;
}
