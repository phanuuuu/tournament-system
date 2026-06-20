// สกัด "สิ่งที่ต้องทำต่อ" ของผู้เล่นข้ามทุกลีค — เฉพาะแมตช์ที่ถึงตาผู้เล่นจริง ๆ ตามสเปกข้อ 9.2
export function getActionItems(uid, leagues, matchesByLeague) {
  const items = [];
  for (const league of leagues) {
    const matches = matchesByLeague[league.id] ?? [];
    for (const m of matches) {
      if (m.kind !== "regular") continue;
      const isMine = m.players.home === uid || m.players.away === uid;
      if (!isMine) continue;

      if (m.status === "one_submitted" && !m.submissions?.[uid]) {
        items.push({ type: "confirm", league, match: m });
      } else if (m.status === "scheduled" && (m.submissionHistory?.length ?? 0) > 0) {
        items.push({ type: "replay", league, match: m });
      } else if (m.status === "scheduled" && league.format === "cup" && m.round === league.currentRound) {
        items.push({ type: "play", league, match: m });
      }
    }
  }
  return items;
}

// สถานะของผู้เล่นในถ้วย: รอเริ่ม / รอผล / ตกรอบ / ผ่านเข้ารอบ / แชมป์
export function getCupStatus(uid, league, matches) {
  const myMatches = matches.filter(
    (m) => m.kind === "regular" && (m.players.home === uid || m.players.away === uid)
  );
  if (myMatches.length === 0) return "รอเริ่มแข่ง";

  const latest = myMatches.reduce((a, b) => (b.round > a.round ? b : a));
  if (latest.status !== "approved" && latest.status !== "walkover") return `รอผลรอบ ${latest.round}`;

  const won =
    latest.status === "walkover"
      ? latest.walkover.winnerUid === uid
      : (() => {
          const isHome = latest.players.home === uid;
          const { scoreHome, scoreAway, penaltyHome, penaltyAway } = latest.approvedResult;
          if (scoreHome === scoreAway) return isHome ? penaltyHome > penaltyAway : penaltyAway > penaltyHome;
          return isHome ? scoreHome > scoreAway : scoreAway > scoreHome;
        })();

  if (!won) return `ตกรอบที่รอบ ${latest.round}`;
  if (league.status === "finished") return "แชมป์ 🏆";
  return `ผ่านเข้ารอบ ${latest.round + 1}`;
}
