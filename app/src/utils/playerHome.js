import { roundLabel } from "./roundLabel";

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

const MAX_NON_URGENT_REMINDERS = 3;

// เตือนแมตช์ลีคเก็บแต้มที่ยังไม่ได้แข่งเลย (ไม่ใช่ urgent) — เลือกแมตช์ที่ค้างนานสุดต่อลีคแบบ deterministic
// (เทียบ createdAt เก่าสุด) จะได้ผลลัพธ์เดิมทุกครั้งที่ render ไม่ใช่สุ่มเปลี่ยนไปมา, จำกัดรวมไม่เกิน 3 รายการ
export function getNonUrgentReminders(uid, leagues, matchesByLeague) {
  const candidates = [];
  for (const league of leagues) {
    if (league.format !== "points" || league.status !== "ongoing") continue;
    const matches = matchesByLeague[league.id] ?? [];
    const unplayed = matches.filter(
      (m) =>
        m.kind === "regular" &&
        (m.players.home === uid || m.players.away === uid) &&
        m.status === "scheduled" &&
        (m.submissionHistory?.length ?? 0) === 0
    );
    if (unplayed.length === 0) continue;

    const oldest = unplayed.reduce((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;
      return bTime < aTime ? b : a;
    });
    candidates.push({ league, match: oldest });
  }
  return candidates.slice(0, MAX_NON_URGENT_REMINDERS);
}

// สถานะของผู้เล่นในถ้วย: รอเริ่ม / รอผล / ตกรอบ / ผ่านเข้ารอบ / แชมป์
// คืนค่าโครงสร้าง {type, text} ให้หน้าเอาไปทำ badge สีตาม type ได้ — ตรรกะตัดสินผลแพ้/ชนะเหมือนเดิมทุกอย่าง
export function getCupStatus(uid, league, matches) {
  const myMatches = matches.filter(
    (m) => m.kind === "regular" && (m.players.home === uid || m.players.away === uid)
  );
  if (myMatches.length === 0) return { type: "waiting", text: "รอเริ่มแข่ง" };

  const latest = myMatches.reduce((a, b) => (b.round > a.round ? b : a));
  if (latest.status !== "approved" && latest.status !== "walkover") {
    return { type: "pending", text: `รอผล${roundLabel(league.size, latest.round)}` };
  }

  const won =
    latest.status === "walkover"
      ? latest.walkover.winnerUid === uid
      : (() => {
          const isHome = latest.players.home === uid;
          const { scoreHome, scoreAway, penaltyHome, penaltyAway } = latest.approvedResult;
          if (scoreHome === scoreAway) return isHome ? penaltyHome > penaltyAway : penaltyAway > penaltyHome;
          return isHome ? scoreHome > scoreAway : scoreAway > scoreHome;
        })();

  if (!won) return { type: "eliminated", text: `ตกรอบ · ${roundLabel(league.size, latest.round)}` };
  if (league.status === "finished") return { type: "champion", text: "แชมป์" };
  return { type: "advancing", text: `ผ่านเข้า${roundLabel(league.size, latest.round + 1)}` };
}
