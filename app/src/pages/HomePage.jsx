import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { subscribeToMyLeagues } from "../firebase/leagues";
import { useMatchesByLeagues } from "../hooks/useMatchesByLeagues";
import { usePublicProfiles } from "../hooks/usePublicProfiles";
import { computeStandings } from "../utils/standings";
import { getActionItems, getCupStatus } from "../utils/playerHome";
import StatusBadge from "../components/StatusBadge";
import { useEffect, useState } from "react";

const FORMAT_LABEL = { cup: "ชิงถ้วย", points: "เก็บแต้ม" };

const ACTION_LABEL = {
  confirm: "คู่แข่งส่งผลแล้ว รอคุณยืนยัน",
  replay: "แอดมินขอให้แข่งใหม่",
  play: "ถึงรอบแข่งของคุณแล้ว",
};

export default function HomePage() {
  const { user, profile } = useAuth();
  const [leagues, setLeagues] = useState(null);

  useEffect(() => subscribeToMyLeagues(user.uid, setLeagues), [user.uid]);

  const leagueIds = leagues?.map((l) => l.id) ?? [];
  const matchesByLeague = useMatchesByLeagues(leagueIds);
  const actionItems = leagues ? getActionItems(user.uid, leagues, matchesByLeague) : [];

  return (
    <div className="page">
      <h1>สวัสดี, {profile?.displayName}</h1>

      <h2>ต้องทำต่อ</h2>
      {leagues === null && <p>กำลังโหลด...</p>}
      {leagues !== null && actionItems.length === 0 && <p>ไม่มีอะไรต้องทำตอนนี้ 🎉</p>}
      <ul className="action-list">
        {actionItems.map(({ type, league, match }) => (
          <li key={match.id}>
            <Link to={`/matches/${match.id}`} className="action-item">
              <span>
                <strong>{league.name}</strong> — {ACTION_LABEL[type]}
              </span>
              <code>{match.matchCode}</code>
            </Link>
          </li>
        ))}
      </ul>

      <h2>ลีคของฉัน</h2>
      {leagues !== null && leagues.length === 0 && (
        <p>
          ยังไม่ได้เข้าร่วมลีคไหนเลย — <Link to="/leagues">ดูลีคที่เปิดรับสมัคร</Link>
        </p>
      )}
      <div className="my-league-list">
        {leagues?.map((league) => (
          <MyLeagueCard key={league.id} league={league} matches={matchesByLeague[league.id] ?? []} uid={user.uid} />
        ))}
      </div>

      <nav className="admin-nav">
        <Link to="/leagues">ลีคทั้งหมด</Link>
        <Link to="/profile">โปรไฟล์</Link>
      </nav>
    </div>
  );
}

function MyLeagueCard({ league, matches, uid }) {
  const myMatches = matches.filter((m) => m.kind === "regular" && (m.players.home === uid || m.players.away === uid));
  const playedCount = myMatches.filter((m) => m.status === "approved" || m.status === "walkover").length;
  const opponentUids = myMatches.map((m) => (m.players.home === uid ? m.players.away : m.players.home));
  const profiles = usePublicProfiles(opponentUids);

  let summary;
  if (league.status === "open") {
    summary = "รอลีคเริ่ม";
  } else if (league.format === "points") {
    const standings = computeStandings(league.playerIds, matches, {});
    const myRow = standings.find((r) => r.uid === uid);
    summary = myRow ? `อันดับ ${myRow.rank} · ${myRow.points} แต้ม` : "-";
  } else {
    summary = getCupStatus(uid, league, matches);
  }

  return (
    <details className="my-league-card">
      <summary>
        <span className="league-card-title">{league.name}</span>
        <span className="league-card-meta">
          {FORMAT_LABEL[league.format]} · {summary} · เล่นแล้ว {playedCount}/{myMatches.length}
        </span>
      </summary>
      <ul className="my-match-list">
        {myMatches.map((m) => {
          const oppUid = m.players.home === uid ? m.players.away : m.players.home;
          return (
            <li key={m.id}>
              <Link to={`/matches/${m.id}`}>
                <StatusBadge status={m.status} />
                <span>vs {profiles[oppUid]?.displayName ?? "..."}</span>
              </Link>
            </li>
          );
        })}
        {myMatches.length === 0 && <li>ยังไม่มีตารางแข่ง</li>}
      </ul>
    </details>
  );
}
