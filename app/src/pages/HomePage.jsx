import { Link, useNavigate } from "react-router-dom";
import { ClipboardCheck, RotateCcw, Play, Calendar, PartyPopper, Gamepad2, Trophy, User, ChevronRight, Search, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { subscribeToMyLeagues } from "../firebase/leagues";
import { findMatchByCode } from "../firebase/matches";
import { useMatchesByLeagues } from "../hooks/useMatchesByLeagues";
import { usePublicProfiles } from "../hooks/usePublicProfiles";
import { computeStandings } from "../utils/standings";
import { getActionItems, getNonUrgentReminders, getCupStatus } from "../utils/playerHome";
import StatusBadge from "../components/StatusBadge";
import Skeleton from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import LeagueAvatar from "../components/LeagueAvatar";
import { useEffect, useRef, useState } from "react";

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
  const navigate = useNavigate();
  const [leagues, setLeagues] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchCode, setSearchCode] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const searchInputRef = useRef(null);

  useEffect(() => subscribeToMyLeagues(user.uid, setLeagues), [user.uid]);

  useEffect(() => {
    if (showSearch) {
      searchInputRef.current?.focus();
    } else {
      setSearchCode("");
      setSearchError("");
    }
  }, [showSearch]);

  useEffect(() => {
    if (!showSearch) return;
    function onKey(e) {
      if (e.key === "Escape") setShowSearch(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showSearch]);

  async function handleMatchSearch(e) {
    e.preventDefault();
    const trimmed = searchCode.trim();
    if (!trimmed) return;
    setSearchError("");
    setSearchLoading(true);
    try {
      const match = await findMatchByCode(trimmed);
      if (!match) {
        setSearchError("ไม่พบแมตช์รหัสนี้");
        return;
      }
      setShowSearch(false);
      navigate(`/matches/${match.id}`);
    } catch {
      setSearchError("เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
    } finally {
      setSearchLoading(false);
    }
  }

  const leagueIds = leagues?.map((l) => l.id) ?? [];
  const matchesByLeague = useMatchesByLeagues(leagueIds);
  const actionItems = leagues ? getActionItems(user.uid, leagues, matchesByLeague) : [];
  const sortedActionItems = [...actionItems].sort((a, b) => PRIORITY[a.type] - PRIORITY[b.type]);
  const nonUrgentReminders = leagues ? getNonUrgentReminders(user.uid, leagues, matchesByLeague) : [];
  const nothingToDo = sortedActionItems.length === 0 && nonUrgentReminders.length === 0;

  return (
    <div className="page">
      <div className="home-header">
        <div className="home-header-left">
          <Link to="/profile" className="home-avatar-link" aria-label="ไปหน้าโปรไฟล์">
            <Avatar photoURL={profile?.photoURL} name={profile?.displayName} />
          </Link>
          <h1>{profile?.displayName}</h1>
        </div>
        <button className="home-button" onClick={() => setShowSearch(true)} aria-label="ค้นหาแมตช์ด้วยรหัส">
          <Search size={18} aria-hidden="true" />
          <span className="home-button-label">ค้นหาแมตช์</span>
        </button>
      </div>

      {showSearch && (
        <>
          <div
            className="match-search-backdrop"
            onClick={() => setShowSearch(false)}
            aria-hidden="true"
          />
          <div
            className="match-search-modal"
            role="dialog"
            aria-modal="true"
            aria-label="ค้นหาแมตช์"
          >
            <div className="match-search-modal-head">
              <span className="match-search-modal-title">ค้นหาแมตช์</span>
              <button className="match-search-close" onClick={() => setShowSearch(false)} aria-label="ปิด">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleMatchSearch} className="match-search-form">
              <input
                ref={searchInputRef}
                className="match-search-input"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                placeholder="เช่น U8NWUD"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                disabled={searchLoading}
              />
              <button
                type="submit"
                className="match-search-submit"
                disabled={searchLoading || !searchCode.trim()}
              >
                {searchLoading ? "กำลังค้นหา…" : "เข้าแมตช์"}
              </button>
            </form>
            {searchError && <p className="match-search-error">{searchError}</p>}
          </div>
        </>
      )}

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
