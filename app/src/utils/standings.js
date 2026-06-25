// คำนวณตารางคะแนนสดจากผลแมตช์เสมอ — ไม่เก็บแต้มเป็นตัวเลขสะสมที่ไหนเลย
// ป้ายแบน (byeBans) เป็น override ที่ "มองทะลุ" เข้าไปเขียนทับผลตอนคำนวณเท่านั้น ไม่แตะ matches เดิม
function emptyStats(uid) {
  return { uid, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 };
}

function recordResult(stats, uidA, uidB, scoreA, scoreB) {
  const a = stats[uidA];
  const b = stats[uidB];
  a.played++;
  b.played++;
  a.gf += scoreA;
  a.ga += scoreB;
  b.gf += scoreB;
  b.ga += scoreA;
  if (scoreA > scoreB) {
    a.won++;
    b.lost++;
  } else if (scoreB > scoreA) {
    b.won++;
    a.lost++;
  } else {
    a.drawn++;
    b.drawn++;
  }
}

function tiebreakerKey(uidA, uidB) {
  return [uidA, uidB].sort().join("|");
}

// แมตช์นับว่า "จบแล้ว" ถ้ามีผลอนุมัติ/ชนะบาย หรือถูกมองทะลุด้วยแพ้บัน (byeBan เขียนทับผลตอนคำนวณ
// โดยไม่แตะ status ของแมตช์เดิมเลย ถ้าไม่เช็กเงื่อนไขนี้ด้วย แมตช์ที่มีคนแพ้บันจะค้างเป็น "ยังไม่จบ" ตลอดไป)
function isRegularMatchSettled(m, byeBans) {
  if (m.status === "approved" || m.status === "walkover") return true;
  return !!(byeBans[m.players.home]?.active || byeBans[m.players.away]?.active);
}

function toMillis(t) {
  if (!t) return 0;
  if (typeof t.toMillis === "function") return t.toMillis();
  if (typeof t.seconds === "number") return t.seconds * 1000;
  if (t instanceof Date) return t.getTime();
  return 0;
}

// ผลแมตช์เดียวจากมุมมองผู้เล่นคนหนึ่ง ("W"/"D"/"L") ใช้ตรรกะเดียวกับ computeStandings เป๊ะ
// (แพ้บาน = แพ้อัตโนมัติ, walkover ใช้ผู้ชนะที่บันทึกไว้, แมตช์ปกติเทียบสกอร์ที่อนุมัติแล้ว) แค่ไม่ได้สะสมเป็นสถิติ คืนผลแยกนัดต่อนัด
function matchOutcomeForPlayer(m, uid, byeBans) {
  const { home, away } = m.players;
  if (uid !== home && uid !== away) return null;
  const opponent = uid === home ? away : home;
  if (byeBans[uid]?.active && byeBans[opponent]?.active) return null;
  if (byeBans[uid]?.active) return "L";
  if (byeBans[opponent]?.active) return "W";
  if (m.status === "walkover") return m.walkover.winnerUid === uid ? "W" : "L";
  if (m.status !== "approved") return null;
  const myScore = uid === home ? m.approvedResult.scoreHome : m.approvedResult.scoreAway;
  const oppScore = uid === home ? m.approvedResult.scoreAway : m.approvedResult.scoreHome;
  if (myScore > oppScore) return "W";
  if (myScore < oppScore) return "L";
  return "D";
}

// ฟอร์ม N นัดหลังสุดต่อผู้เล่น (เรียงเก่า -> ใหม่) คำนวณจากผลแมตช์ที่มีอยู่แล้วล้วน ๆ ฝั่ง client ไม่มี field ใหม่ใน DB
// เรียงตามเวลาที่ตัดสินผลจริง (decidedAt) ถ้าไม่มีค่อย fallback ไป createdAt (เช่น walkover ที่ไม่มี decidedAt ของตัวเอง)
export function computeForm(playerIds, matches, byeBans = {}, limit = 5) {
  const regular = matches.filter((m) => m.kind === "regular");
  const form = {};
  for (const uid of playerIds) {
    const outcomes = [];
    for (const m of regular) {
      if (m.players.home !== uid && m.players.away !== uid) continue;
      const outcome = matchOutcomeForPlayer(m, uid, byeBans);
      if (outcome == null) continue;
      outcomes.push({ outcome, at: toMillis(m.approvedResult?.decidedAt ?? m.createdAt) });
    }
    outcomes.sort((a, b) => a.at - b.at);
    form[uid] = outcomes.slice(-limit).map((o) => o.outcome);
  }
  return form;
}

export function computeStandings(playerIds, matches, byeBans = {}) {
  const stats = {};
  for (const uid of playerIds) stats[uid] = emptyStats(uid);

  for (const m of matches) {
    if (m.kind !== "regular") continue;
    const { home, away } = m.players;
    const homeBanned = byeBans[home]?.active;
    const awayBanned = byeBans[away]?.active;

    if (homeBanned && awayBanned) continue; // ทั้งคู่ถูกแบน ไม่นับแมตช์นี้เลย
    if (homeBanned) {
      recordResult(stats, home, away, 0, 3);
      continue;
    }
    if (awayBanned) {
      recordResult(stats, home, away, 3, 0);
      continue;
    }
    if (m.status !== "approved") continue;
    recordResult(stats, home, away, m.approvedResult.scoreHome, m.approvedResult.scoreAway);
  }

  const rows = Object.values(stats).map((s) => ({
    ...s,
    gd: s.gf - s.ga,
    points: s.won * 3 + s.drawn,
  }));

  rows.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);

  // ยังไม่ควรเตือนให้จัดแมตช์ตัดสินถ้าฤดูกาลยังแข่งไม่ครบ (ไม่งั้นพอลีคเพิ่งเริ่ม ทุกคนแต้ม/ลูกเท่ากันเป๊ะ
  // จะโดนเตือนให้จัดตัดสินทุกคู่ทันทีทั้งที่ยังไม่ได้แข่งกันเลย)
  const seasonComplete = matches
    .filter((m) => m.kind === "regular")
    .every((m) => isRegularMatchSettled(m, byeBans));

  // หาผู้ชนะแมตช์ตัดสิน (tiebreaker) ที่อนุมัติแล้ว ใช้จัดลำดับคู่ที่เท่ากันเป๊ะให้ตรงผลจริง
  const tiebreakerWinner = {};
  for (const m of matches) {
    if (m.kind === "tiebreaker" && m.status === "approved") {
      const { scoreHome, scoreAway, penaltyHome, penaltyAway } = m.approvedResult;
      const { home, away } = m.players;
      const winner =
        scoreHome > scoreAway ? home : scoreAway > scoreHome ? away : penaltyHome > penaltyAway ? home : away;
      tiebreakerWinner[tiebreakerKey(home, away)] = winner;
    }
  }

  const sameKey = (a, b) => a.points === b.points && a.gd === b.gd && a.gf === b.gf;

  // จัดกลุ่มแถวที่เท่ากันเป๊ะทุกตัวตัดสิน แล้วลองจัดลำดับในกลุ่มด้วยผลแมตช์ตัดสิน (ถ้ามี)
  const result = [];
  let rank = 1;
  let i = 0;
  while (i < rows.length) {
    let j = i + 1;
    while (j < rows.length && sameKey(rows[j], rows[i])) j++;
    const group = rows.slice(i, j);

    if (group.length > 1) {
      group.sort((a, b) => {
        const winner = tiebreakerWinner[tiebreakerKey(a.uid, b.uid)];
        if (winner === a.uid) return -1;
        if (winner === b.uid) return 1;
        return 0;
      });
    }

    const fullyResolved =
      group.length > 1 && group.every((row, idx) => group.slice(idx + 1).every((other) => tiebreakerWinner[tiebreakerKey(row.uid, other.uid)]));

    group.forEach((row, idx) => {
      result.push({
        ...row,
        rank: fullyResolved ? rank + idx : rank,
        tied: group.length > 1,
        stillTied: group.length > 1 && !fullyResolved && seasonComplete,
      });
    });

    rank += group.length;
    i = j;
  }

  return result;
}
