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
import { subscribeToLeagueMatches } from "../firebase/matches";
import { usePublicProfiles } from "../hooks/usePublicProfiles";
import MatchListRaw from "../components/MatchListRaw";

const FORMAT_LABEL = { cup: "ชิงถ้วย", points: "เก็บแต้ม" };
const MATCH_TYPE_LABEL = { single: "นัดเดียว", homeAway: "เหย้า-เยือน" };
const STATUS_LABEL = { open: "เปิดรับสมัคร", ongoing: "กำลังแข่ง", finished: "จบแล้ว" };

export default function AdminLeagueDetailPage() {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const [league, setLeague] = useState(undefined);
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const profiles = usePublicProfiles(league?.playerIds);

  useEffect(() => subscribeToLeague(leagueId, setLeague), [leagueId]);
  useEffect(() => subscribeToLeagueMatches(leagueId, setMatches), [leagueId]);

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

  if (league === undefined) return <p>กำลังโหลด...</p>;
  if (league === null) return <p>ไม่พบลีคนี้</p>;

  return (
    <div className="page">
      <Link to="/admin/leagues">← ลีคทั้งหมด</Link>
      <h1>{league.name}</h1>
      <p>
        {FORMAT_LABEL[league.format]} ({MATCH_TYPE_LABEL[league.matchType]}) — {STATUS_LABEL[league.status]}
      </p>
      <p>
        ผู้เล่น: {league.playerIds.length}/{league.size}
      </p>

      {error && <p className="form-error">{error}</p>}

      <ul>
        {league.playerIds.map((uid) => (
          <li key={uid}>
            {profiles[uid]?.displayName ?? "กำลังโหลด..."}
            {league.status === "open" && (
              <button type="button" disabled={busy} onClick={() => handleKick(uid)}>
                เตะออก
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="admin-actions">
        {league.status === "open" && (
          <button type="button" disabled={busy || !canStartLeague(league)} onClick={handleStart}>
            เริ่มลีค
          </button>
        )}
        {!canStartLeague(league) && league.status === "open" && (
          <p>
            {league.format === "cup"
              ? "ต้องรอผู้เล่นเต็มก่อนถึงจะเริ่มได้"
              : "ต้องมีผู้เล่นเป็นจำนวนคู่ (อย่างน้อย 2 คน) ก่อนถึงจะเริ่มได้"}
          </p>
        )}
        {canDeleteLeague(league) && (
          <button type="button" disabled={busy} onClick={handleDelete}>
            ลบลีค
          </button>
        )}
      </div>

      {matches.length > 0 && <MatchListRaw matches={matches} profiles={profiles} />}
    </div>
  );
}
