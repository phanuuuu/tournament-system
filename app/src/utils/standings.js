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
        stillTied: group.length > 1 && !fullyResolved,
      });
    });

    rank += group.length;
    i = j;
  }

  return result;
}
