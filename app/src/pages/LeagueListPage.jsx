import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { subscribeToLeagues, joinLeague, leaveLeague } from "../firebase/leagues";
import Skeleton from "../components/Skeleton";
import EmptyState from "../components/EmptyState";

const FORMAT_LABEL = { cup: "ชิงถ้วย", points: "เก็บแต้ม" };
const MATCH_TYPE_LABEL = { single: "นัดเดียว", homeAway: "เหย้า-เยือน" };
const TABS = [
  { key: "open", label: "เปิดรับสมัคร" },
  { key: "ongoing", label: "กำลังแข่ง" },
  { key: "finished", label: "จบแล้ว" },
];
const EMPTY_BY_TAB = {
  open: { icon: "📭", title: "ยังไม่มีลีคเปิดรับสมัคร", subtitle: "รอแอดมินสร้างลีคใหม่ได้เลย" },
  ongoing: { icon: "⏳", title: "ไม่มีลีคที่กำลังแข่งอยู่ตอนนี้" },
  finished: { icon: "🏁", title: "ยังไม่มีลีคที่จบแล้ว" },
};

export default function LeagueListPage() {
  const { user, profile } = useAuth();
  const [leagues, setLeagues] = useState(null);
  const [tab, setTab] = useState("open");
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => subscribeToLeagues(setLeagues), []);

  async function handleJoin(league) {
    setError("");
    setBusyId(league.id);
    try {
      await joinLeague(league.id, user.uid);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleLeave(league) {
    setError("");
    setBusyId(league.id);
    try {
      await leaveLeague(league.id, user.uid);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const filtered = leagues?.filter((l) => l.status === tab) ?? [];

  return (
    <div className="page">
      <h1>ลีคทั้งหมด</h1>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={tab === t.key ? "tab-active" : ""}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {error && <p className="form-error">{error}</p>}

      {leagues === null && (
        <ul className="league-list">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <span style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                <Skeleton width="60%" height="16px" />
                <Skeleton width="45%" height="12px" />
              </span>
            </li>
          ))}
        </ul>
      )}

      {leagues !== null && filtered.length === 0 && <EmptyState {...EMPTY_BY_TAB[tab]} />}

      <ul className="league-list">
        {filtered.map((league) => {
          const joined = league.playerIds.includes(user.uid);
          const full = league.playerIds.length >= league.size;

          return (
            <li key={league.id}>
              <Link to={`/leagues/${league.id}`} className="league-card-info">
                <span className="league-card-title">{league.name}</span>
                <span className="league-card-meta">
                  {FORMAT_LABEL[league.format]} · {MATCH_TYPE_LABEL[league.matchType]} · {league.playerIds.length}/
                  {league.size} คน
                </span>
              </Link>

              {tab === "open" && profile?.role !== "admin" && (
                <button
                  type="button"
                  className={joined ? "btn-ghost btn-sm" : "btn-primary btn-sm"}
                  disabled={busyId === league.id || (full && !joined)}
                  onClick={() => (joined ? handleLeave(league) : handleJoin(league))}
                >
                  {joined ? "เข้าร่วมแล้ว (ออก)" : full ? "เต็มแล้ว" : "เข้าร่วม"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
