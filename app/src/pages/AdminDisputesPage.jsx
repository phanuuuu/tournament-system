import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { subscribeToDisputedMatches, findMatchByCode } from "../firebase/matches";
import { resolveDisputeUseSubmission, resolveDisputeReplay } from "../firebase/matchSubmission";
import { usePublicProfiles } from "../hooks/usePublicProfiles";

export default function AdminDisputesPage() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [searchCode, setSearchCode] = useState("");
  const [searchError, setSearchError] = useState("");

  useEffect(() => subscribeToDisputedMatches(setMatches), []);

  const allUids = (matches ?? []).flatMap((m) => [m.players.home, m.players.away]);
  const profiles = usePublicProfiles(allUids);

  async function handleUseSubmission(matchId, uid) {
    setError("");
    setBusyId(matchId);
    try {
      await resolveDisputeUseSubmission(matchId, uid);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReplay(matchId) {
    setError("");
    setBusyId(matchId);
    try {
      await resolveDisputeReplay(matchId);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    setSearchError("");
    const match = await findMatchByCode(searchCode);
    if (!match) return setSearchError("ไม่พบแมตช์ที่ใช้รหัสนี้");
    navigate(`/matches/${match.id}`);
  }

  return (
    <div className="page">
      <Link to="/admin/leagues">← จัดการลีค</Link>
      <h1>ข้อพิพาท (สกอร์ไม่ตรง)</h1>

      <form onSubmit={handleSearch}>
        <label>
          ค้นหาแมตช์ด้วยรหัส
          <input value={searchCode} onChange={(e) => setSearchCode(e.target.value)} />
        </label>
        {searchError && <p className="form-error">{searchError}</p>}
        <button type="submit">ค้นหา</button>
      </form>

      {error && <p className="form-error">{error}</p>}
      {matches === null && <p>กำลังโหลด...</p>}
      {matches?.length === 0 && <p>ไม่มีข้อพิพาทตอนนี้</p>}

      <ul className="league-list">
        {matches?.map((m) => {
          const home = m.submissions[m.players.home];
          const away = m.submissions[m.players.away];
          return (
            <li key={m.id} style={{ flexDirection: "column", alignItems: "flex-start" }}>
              <p>
                <code>{m.matchCode}</code> — <Link to={`/matches/${m.id}`}>ดูหน้าแมตช์</Link>
              </p>
              <p>
                {profiles[m.players.home]?.displayName}: {home.scoreHome}-{home.scoreAway}
                {home.penaltyHome != null && <> (จุดโทษ {home.penaltyHome}-{home.penaltyAway})</>}{" "}
                {home.photoURL ? "📷 มีรูป" : "ไม่มีรูป"}
                <button type="button" disabled={busyId === m.id} onClick={() => handleUseSubmission(m.id, m.players.home)}>
                  ใช้ผลนี้
                </button>
              </p>
              <p>
                {profiles[m.players.away]?.displayName}: {away.scoreHome}-{away.scoreAway}
                {away.penaltyHome != null && <> (จุดโทษ {away.penaltyHome}-{away.penaltyAway})</>}{" "}
                {away.photoURL ? "📷 มีรูป" : "ไม่มีรูป"}
                <button type="button" disabled={busyId === m.id} onClick={() => handleUseSubmission(m.id, m.players.away)}>
                  ใช้ผลนี้
                </button>
              </p>
              <button type="button" disabled={busyId === m.id} onClick={() => handleReplay(m.id)}>
                ให้แข่งใหม่
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
