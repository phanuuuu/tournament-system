import { Link } from "react-router-dom";
import { ClipboardCheck, RotateCcw, Play, Calendar, PartyPopper, Gamepad2, Trophy, User, ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { subscribeToMyLeagues } from "../firebase/leagues";
import { useMatchesByLeagues } from "../hooks/useMatchesByLeagues";
import { usePublicProfiles } from "../hooks/usePublicProfiles";
import { computeStandings } from "../utils/standings";
import { getActionItems, getNonUrgentReminders, getCupStatus } from "../utils/playerHome";
import StatusBadge from "../components/StatusBadge";
import Skeleton from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import LeagueAvatar from "../components/LeagueAvatar";
import { useEffect, useState } from "react";

const FORMAT_LABEL = { cup: "ชิงถ้วย", points: "เก็บแต้ม" };

const ACTION_LABEL = {
  confirm: "คู่แข่งส่งผลแล้ว รอคุณยืนยัน",
  replay: "แอดมินขอให้แข่งใหม่",
  play: "ถึงรอบแข่งของคุณแล้ว",
};

const ACTION_ICON = { confirm: ClipboardCheck, replay: RotateCcw, play: Play };

// เรียงตามความเร่งด่วน: รอยืนยัน/แข่งใหม่ (แอดมินหรือคู่แข่งรออยู่) ก่อนแค่ "ถึงตาแข่ง" (ยังไม่มีใครรอ)
const PRIORITY = { confirm: 0, replay: 0, play: 1 };

const CUP_STATUS_SHORT = {
  waiting: "รอเริ่ม",
  pending: "รอผล",
  advancing: "ผ่านเข้ารอบ",
  eliminated: "ตกรอบ",
  champion: "แชมป์",
};

function Avatar({ photoURL, name, className = "home-avatar" }) {
  return photoURL ? (
    <img src={photoURL} alt={name ?? "โปรไฟล์"} className={className} />
  ) : (
    <span className={`${className} home-avatar-fallback`}>{name?.[0] ?? "?"}</span>
  );
}

export default function HomePage() {
  const { user, profile } = useAuth();
  const [leagues, setLeagues] = useState(null);

  useEffect(() => subscribeToMyLeagues(user.uid, setLeagues), [user.uid]);

  const leagueIds = leagues?.map((l) => l.id) ?? [];
  const matchesByLeague = useMatchesByLeagues(leagueIds);
  const actionItems = leagues ? getActionItems(user.uid, leagues, matchesByLeague) : [];
  const sortedActionItems = [...actionItems].sort((a, b) => PRIORITY[a.type] - PRIORITY[b.type]);
  const nonUrgentReminders = leagues ? getNonUrgentReminders(user.uid, leagues, matchesByLeague) : [];
  const nothingToDo = sortedActionItems.length === 0 && nonUrgentReminders.length === 0;

  return (
    <div className="page">
      <div className="home-header">
        <Link to="/profile" className="home-avatar-link" aria-label="ไปหน้าโปรไฟล์">
          <Avatar photoURL={profile?.photoURL} name={profile?.displayName} />
        </Link>
        <h1>{profile?.displayName}</h1>
      </div>

      <h2>ต้องทำต่อ</h2>
      {leagues === null && <Skeleton width="100%" height="48px" radius="12px" />}
      {leagues !== null && nothingToDo && (
        <EmptyState compact icon={PartyPopper} title="ไม่มีอะไรต้องทำตอนนี้" subtitle="พักได้ รอคู่แข่งบ้าง" />
      )}
      <ul className="action-list">
        {sortedActionItems.map(({ type, league, match }) => {
          const ActionIcon = ACTION_ICON[type];
          return (
            <li key={match.id}>
              <Link
                to={`/matches/${match.id}`}
                className={`action-item ${PRIORITY[type] === 0 ? "action-item-urgent" : ""}`}
              >
                <span className="action-item-text">
                  <span className="action-item-icon" aria-hidden="true">
                    <ActionIcon size={16} />
                  </span>
                  <span>
                    <strong>{league.name}</strong> — {ACTION_LABEL[type]}
                  </span>
                </span>
                <code>{match.matchCode}</code>
              </Link>
            </li>
          );
        })}
        {nonUrgentReminders.map(({ league, match }) => (
          <li key={match.id}>
            <Link to={`/matches/${match.id}`} className="action-item action-item-relaxed">
              <span className="action-item-text">
                <span className="action-item-icon" aria-hidden="true">
                  <Calendar size={16} />
                </span>
                <span>
                  <strong>{league.name}</strong> — ยังมีแมตช์ให้แข่ง <span className="action-item-tag">ไม่ด่วน</span>
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
          icon={Gamepad2}
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

      <nav className="home-quick-nav">
        <Link to="/leagues" className="home-quick-nav-item">
          <span className="home-quick-nav-icon" aria-hidden="true">
            <Trophy size={22} />
          </span>
          <span>ลีคทั้งหมด</span>
        </Link>
        <Link to="/profile" className="home-quick-nav-item">
          <span className="home-quick-nav-icon" aria-hidden="true">
            <User size={22} />
          </span>
          <span>โปรไฟล์</span>
        </Link>
      </nav>
    </div>
  );
}

function RankChip({ rank }) {
  const tier = rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : "";
  return <span className={`rank-chip ${tier && `rank-chip-${tier}`}`}>#{rank}</span>;
}

function CupStatusBadge({ type }) {
  return (
    <span className={`cup-status-badge cup-status-${type}`}>
      {type === "champion" && <Trophy size={11} aria-hidden="true" />}
      {CUP_STATUS_SHORT[type]}
    </span>
  );
}

function MyLeagueCard({ league, matches, uid }) {
  const myMatches = matches.filter((m) => m.kind === "regular" && (m.players.home === uid || m.players.away === uid));
  const playedCount = myMatches.filter((m) => m.status === "approved" || m.status === "walkover").length;
  const opponentUids = myMatches.map((m) => (m.players.home === uid ? m.players.away : m.players.home));
  const profiles = usePublicProfiles(opponentUids);

  let summaryText;
  let myRank = null;
  let cupStatusType = null;
  if (league.status === "open") {
    summaryText = "รอลีคเริ่ม";
  } else if (league.format === "points") {
    const standings = computeStandings(league.playerIds, matches, {});
    const myRow = standings.find((r) => r.uid === uid);
    summaryText = myRow ? `${myRow.points} แต้ม` : "-";
    myRank = myRow?.rank ?? null;
  } else {
    const cupStatus = getCupStatus(uid, league, matches);
    summaryText = cupStatus.text;
    cupStatusType = cupStatus.type;
  }

  const totalMatches = myMatches.length;
  const progressPct = totalMatches > 0 ? Math.round((playedCount / totalMatches) * 100) : 0;

  return (
    <div className="my-league-card">
      <div className="my-league-card-head">
        <Link to={`/leagues/${league.id}`} className="my-league-card-link">
          <LeagueAvatar league={league} size={28} />
          <span className="league-card-title">{league.name}</span>
          <span className="my-league-card-chevron" aria-hidden="true">
            <ChevronRight size={18} />
          </span>
        </Link>
        {myRank != null && <RankChip rank={myRank} />}
        {cupStatusType != null && <CupStatusBadge type={cupStatusType} />}
      </div>
      <span className="league-card-meta">
        {FORMAT_LABEL[league.format]} · {summaryText}
      </span>
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
      <details className="my-league-card-details">
        <summary>ดูแมตช์ทั้งหมด</summary>
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
    </div>
  );
}
