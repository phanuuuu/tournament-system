import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { subscribeToMyLeagues } from "../firebase/leagues";
import { useMatchesByLeagues } from "../hooks/useMatchesByLeagues";
import { usePublicProfiles } from "../hooks/usePublicProfiles";
import { computeStandings } from "../utils/standings";
import { getActionItems, getCupStatus } from "../utils/playerHome";
import StatusBadge from "../components/StatusBadge";
import Skeleton from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import { useEffect, useState } from "react";

const FORMAT_LABEL = { cup: "ชิงถ้วย", points: "เก็บแต้ม" };

const ACTION_LABEL = {
  confirm: "คู่แข่งส่งผลแล้ว รอคุณยืนยัน",
  replay: "แอดมินขอให้แข่งใหม่",
  play: "ถึงรอบแข่งของคุณแล้ว",
};

const ACTION_ICON = { confirm: "📝", replay: "🔁", play: "▶️" };

// เรียงตามความเร่งด่วน: รอยืนยัน/แข่งใหม่ (แอดมินหรือคู่แข่งรออยู่) ก่อนแค่ "ถึงตาแข่ง" (ยังไม่มีใครรอ)
const PRIORITY = { confirm: 0, replay: 0, play: 1 };

export default function HomePage() {
  const { user, profile } = useAuth();
  const [leagues, setLeagues] = useState(null);

  useEffect(() => subscribeToMyLeagues(user.uid, setLeagues), [user.uid]);

  const leagueIds = leagues?.map((l) => l.id) ?? [];
  const matchesByLeague = useMatchesByLeagues(leagueIds);
  const actionItems = leagues ? getActionItems(user.uid, leagues, matchesByLeague) : [];
  const sortedActionItems = [...actionItems].sort((a, b) => PRIORITY[a.type] - PRIORITY[b.type]);

  return (
    <div className="page">
      <h1>สวัสดี, {profile?.displayName}</h1>

      <h2>ต้องทำต่อ</h2>
      {leagues === null && <Skeleton width="100%" height="48px" radius="12px" />}
      {leagues !== null && actionItems.length === 0 && (
        <EmptyState compact icon="🎉" title="ไม่มีอะไรต้องทำตอนนี้" subtitle="พักได้ รอคู่แข่งบ้าง" />
      )}
      <ul className="action-list">
        {sortedActionItems.map(({ type, league, match }) => (
          <li key={match.id}>
            <Link
              to={`/matches/${match.id}`}
              className={`action-item ${PRIORITY[type] === 0 ? "action-item-urgent" : ""}`}
            >
              <span className="action-item-text">
                <span className="action-item-icon" aria-hidden="true">
                  {ACTION_ICON[type]}
                </span>
                <span>
                  <strong>{league.name}</strong> — {ACTION_LABEL[type]}
                </span>
              </span>
              <code>{match.matchCode}</code>
            </Link>
          </li>
        ))}
      </ul>

      <h2>ลีคของฉัน</h2>
      {leagues !== null && leagues.length === 0 && (
        <EmptyState
          icon="🎮"
          title="ยังไม่ได้เข้าร่วมลีคไหนเลย"
          subtitle={
            <>
              ไปดู<Link to="/leagues">ลีคที่เปิดรับสมัคร</Link>กันเลย
            </>
          }
        />
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

function RankChip({ rank }) {
  const tier = rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : "";
  return <span className={`rank-chip ${tier && `rank-chip-${tier}`}`}>#{rank}</span>;
}

function MyLeagueCard({ league, matches, uid }) {
  const myMatches = matches.filter((m) => m.kind === "regular" && (m.players.home === uid || m.players.away === uid));
  const playedCount = myMatches.filter((m) => m.status === "approved" || m.status === "walkover").length;
  const opponentUids = myMatches.map((m) => (m.players.home === uid ? m.players.away : m.players.home));
  const profiles = usePublicProfiles(opponentUids);

  let summary;
  let myRank = null;
  if (league.status === "open") {
    summary = "รอลีคเริ่ม";
  } else if (league.format === "points") {
    const standings = computeStandings(league.playerIds, matches, {});
    const myRow = standings.find((r) => r.uid === uid);
    summary = myRow ? `${myRow.points} แต้ม` : "-";
    myRank = myRow?.rank ?? null;
  } else {
    summary = getCupStatus(uid, league, matches);
  }

  const totalMatches = myMatches.length;
  const progressPct = totalMatches > 0 ? Math.round((playedCount / totalMatches) * 100) : 0;

  return (
    <details className="my-league-card">
      <summary>
        <div className="my-league-card-top">
          <span className="league-card-title">{league.name}</span>
          {myRank != null && <RankChip rank={myRank} />}
        </div>
        <span className="league-card-meta">{FORMAT_LABEL[league.format]} · {summary}</span>
        {totalMatches > 0 && (
          <>
            <div className="my-league-progress-track">
              <div className="my-league-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="league-card-meta">
              เล่นแล้ว {playedCount}/{totalMatches}
            </span>
          </>
        )}
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
