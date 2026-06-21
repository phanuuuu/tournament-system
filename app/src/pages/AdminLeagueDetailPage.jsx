import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  subscribeToLeague,
  startLeague,
  deleteLeague,
  kickPlayer,
  canStartLeague,
  canDeleteLeague,
} from "../firebase/leagues";
import { subscribeToLeagueMatches, createTiebreakerMatch, revertLatestRound } from "../firebase/matches";
import { subscribeToByeBans, setByeBan } from "../firebase/byeBans";
import { usePublicProfiles } from "../hooks/usePublicProfiles";
import { useAuth } from "../context/AuthContext";
import LeagueResultsView from "../components/LeagueResultsView";
import Spinner from "../components/Spinner";

const FORMAT_LABEL = { cup: "ชิงถ้วย", points: "เก็บแต้ม" };
const MATCH_TYPE_LABEL = { single: "นัดเดียว", homeAway: "เหย้า-เยือน" };
const STATUS_LABEL = { open: "เปิดรับสมัคร", ongoing: "กำลังแข่ง", finished: "จบแล้ว" };

export default function AdminLeagueDetailPage() {
  const { leagueId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [league, setLeague] = useState(undefined);
  const [matches, setMatches] = useState([]);
  const [byeBans, setByeBans] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const profiles = usePublicProfiles(league?.playerIds);

  useEffect(() => subscribeToLeague(leagueId, setLeague), [leagueId]);
  useEffect(() => subscribeToLeagueMatches(leagueId, setMatches), [leagueId]);
  useEffect(() => subscribeToByeBans(leagueId, setByeBans), [leagueId]);

  async function handleStart() {
    setError("");
    setBusy(true);
    try {
      await startLeague(league);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setError("");
    setBusy(true);
    try {
      await deleteLeague(leagueId);
      navigate("/admin/leagues", { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function handleKick(uid) {
    setError("");
    setBusy(true);
    try {
      await kickPlayer(leagueId, uid);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleBan(uid) {
    setError("");
    setBusy(true);
    try {
      await setByeBan(leagueId, uid, !byeBans[uid]?.active, user.uid);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRevert() {
    setError("");
    if (!window.confirm("ย้อนรอบล่าสุด: ลบคู่ในรอบที่สร้างอัตโนมัติล่าสุดทิ้ง แล้วให้คุณแก้ผลรอบก่อนหน้าใหม่ ยืนยันหรือไม่?")) return;
    setBusy(true);
    try {
      await revertLatestRound(league);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (league === undefined) return <div className="page-loader"><Spinner size="lg" /></div>;
  if (league === null) return <p>ไม่พบลีคนี้</p>;

  return (
    <div className="page-wide">
      <Link to="/admin/leagues">← ลีคทั้งหมด</Link>
      <h1>{league.name}</h1>
      <p>
        {FORMAT_LABEL[league.format]} ({MATCH_TYPE_LABEL[league.matchType]}) ·{" "}
        <span className={`status-badge status-${{ open: "yellow", ongoing: "green", finished: "gray" }[league.status]}`}>
          {STATUS_LABEL[league.status]}
        </span>
      </p>
      <p>
        ผู้เล่น: {league.playerIds.length}/{league.size}
      </p>

      {error && <p className="form-error">{error}</p>}

      <ul className="league-list">
        {league.playerIds.map((uid) => (
          <li key={uid}>
            <span>
              {profiles[uid]?.displayName ?? "กำลังโหลด..."}
              {byeBans[uid]?.active && <span className="status-badge status-orange"> แพ้บาย</span>}
            </span>
            <span className="row-actions">
              {league.status === "open" && (
                <button type="button" className="btn-ghost btn-sm" disabled={busy} onClick={() => handleKick(uid)}>
                  {busy && <Spinner size="sm" />} เตะออก
                </button>
              )}
              {league.format === "points" && league.status === "ongoing" && (
                <button type="button" className="btn-ghost btn-sm" disabled={busy} onClick={() => handleToggleBan(uid)}>
                  {busy && <Spinner size="sm" />} {byeBans[uid]?.active ? "เลิกแพ้บาย" : "แพ้บาย"}
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>

      <div className="admin-actions">
        {league.status === "open" && (
          <button type="button" className="btn-primary" disabled={busy || !canStartLeague(league)} onClick={handleStart}>
            {busy && <Spinner size="sm" />} เริ่มลีค
          </button>
        )}
        {!canStartLeague(league) && league.status === "open" && (
          <p>
            {league.format === "cup"
              ? "ต้องรอผู้เล่นเต็มก่อนถึงจะเริ่มได้"
              : "ต้องมีผู้เล่นเป็นจำนวนคู่ (อย่างน้อย 2 คน) ก่อนถึงจะเริ่มได้"}
          </p>
        )}
        {league.format === "cup" && league.status === "ongoing" && league.currentRound > 1 && (
          <button type="button" className="btn-ghost" disabled={busy} onClick={handleRevert}>
            {busy && <Spinner size="sm" />} ย้อนรอบล่าสุด
          </button>
        )}
        {canDeleteLeague(league) && (
          <button type="button" className="btn-danger" disabled={busy} onClick={handleDelete}>
            {busy && <Spinner size="sm" />} ลบลีค
          </button>
        )}
      </div>

      <LeagueResultsView
        league={league}
        matches={matches}
        profiles={profiles}
        byeBans={byeBans}
        isAdmin
        onCreateTiebreaker={(a, b) => createTiebreakerMatch(leagueId, a, b)}
      />
    </div>
  );
}
