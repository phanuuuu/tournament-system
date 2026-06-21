import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { subscribeToLeagues, joinLeague, leaveLeague } from "../firebase/leagues";
import Skeleton from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import PlayerCountRing from "../components/PlayerCountRing";
import Spinner from "../components/Spinner";

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
  const tabRefs = useRef({});
  const [underline, setUnderline] = useState({ left: 0, width: 0 });

  useEffect(() => subscribeToLeagues(setLeagues), []);

  useLayoutEffect(() => {
    const el = tabRefs.current[tab];
    if (el) setUnderline({ left: el.offsetLeft, width: el.offsetWidth });
  }, [tab]);

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

      <nav className="tabs-underline">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            ref={(el) => (tabRefs.current[t.key] = el)}
            className={tab === t.key ? "tab-active" : ""}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
        <span
          className="tabs-underline-bar"
          style={{ transform: `translateX(${underline.left}px)`, width: underline.width }}
        />
      </nav>

      {error && <p className="form-error">{error}</p>}

      {leagues === null && (
        <ul className="league-card-grid">
          {[0, 1, 2].map((i) => (
            <li key={i} className="league-card surface-glass">
              <Skeleton width="50%" height="14px" />
              <Skeleton width="70%" height="18px" />
              <Skeleton width="40%" height="12px" />
            </li>
          ))}
        </ul>
      )}

      {leagues !== null && filtered.length === 0 && <EmptyState {...EMPTY_BY_TAB[tab]} />}

      <ul className="league-card-grid">
        {filtered.map((league) => {
          const joined = league.playerIds.includes(user.uid);
          const full = league.playerIds.length >= league.size;
          const isCup = league.format === "cup";

          return (
            <li key={league.id} className="league-card surface-glass surface-glass-interactive">
              <Link to={`/leagues/${league.id}`} className="league-card-link">
                <div className="league-card-badges">
                  <span className={`chip ${isCup ? "chip-accent" : "chip-accent-2"}`}>
                    <span className="chip-dot" />
                    {FORMAT_LABEL[league.format]}
                  </span>
                  <span className="chip">{MATCH_TYPE_LABEL[league.matchType]}</span>
                </div>
                <span className="league-card-title">{league.name}</span>
              </Link>

              <div className="league-card-bottom">
                <PlayerCountRing count={league.playerIds.length} size={league.size} />

                {tab === "open" && profile?.role !== "admin" && (
                  <button
                    type="button"
                    className={joined ? "btn-ghost btn-sm" : "btn-primary btn-sm"}
                    disabled={busyId === league.id || (full && !joined)}
                    onClick={() => (joined ? handleLeave(league) : handleJoin(league))}
                  >
                    {busyId === league.id && <Spinner size="sm" />}
                    {joined ? "เข้าร่วมแล้ว (ออก)" : full ? "เต็มแล้ว" : "เข้าร่วม"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
