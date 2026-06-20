import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { subscribeToLeagues, joinLeague, leaveLeague } from "../firebase/leagues";

const FORMAT_LABEL = { cup: "ชิงถ้วย", points: "เก็บแต้ม" };
const MATCH_TYPE_LABEL = { single: "นัดเดียว", homeAway: "เหย้า-เยือน" };
const TABS = [
  { key: "open", label: "เปิดรับสมัคร" },
  { key: "ongoing", label: "กำลังแข่ง" },
  { key: "finished", label: "จบแล้ว" },
];

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
      {leagues === null && <p>กำลังโหลด...</p>}
      {leagues !== null && filtered.length === 0 && <p>ไม่มีลีคในหมวดนี้</p>}

      <ul className="league-list">
        {filtered.map((league) => {
          const joined = league.playerIds.includes(user.uid);
          const full = league.playerIds.length >= league.size;

          return (
            <li key={league.id}>
              <Link to={`/leagues/${league.id}`}>
                {league.name} — {FORMAT_LABEL[league.format]} ({MATCH_TYPE_LABEL[league.matchType]}) —{" "}
                {league.playerIds.length}/{league.size}
              </Link>

              {tab === "open" && profile?.role !== "admin" && (
                <button
                  type="button"
                  disabled={busyId === league.id || (full && !joined)}
                  onClick={() => (joined ? handleLeave(league) : handleJoin(league))}
                >
                  {joined ? "เข้าร่วมแล้ว (กดเพื่อออก)" : full ? "เต็มแล้ว" : "เข้าร่วม"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
