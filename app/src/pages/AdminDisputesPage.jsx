import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  subscribeToDisputedMatches,
  subscribeToContactIssueMatches,
  findMatchByCode,
  grantWalkover,
  clearContactIssue,
} from "../firebase/matches";
import { resolveDisputeUseSubmission, resolveDisputeReplay } from "../firebase/matchSubmission";
import { usePublicProfiles } from "../hooks/usePublicProfiles";
import Skeleton from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import Spinner from "../components/Spinner";
import PageHeader from "../components/PageHeader";
import { ShieldCheck, Phone, Camera } from "lucide-react";

export default function AdminDisputesPage() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState(null);
  const [contactIssues, setContactIssues] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [searchCode, setSearchCode] = useState("");
  const [searchError, setSearchError] = useState("");

  useEffect(() => subscribeToDisputedMatches(setMatches), []);
  useEffect(() => subscribeToContactIssueMatches(setContactIssues), []);

  const allUids = [...(matches ?? []), ...(contactIssues ?? [])].flatMap((m) => [m.players.home, m.players.away]);
  const profiles = usePublicProfiles(allUids);

  async function handleGrantWalkover(matchId, uid) {
    setError("");
    setBusyId(matchId);
    try {
      await grantWalkover(matchId, uid);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleClearContactIssue(matchId) {
    setError("");
    setBusyId(matchId);
    try {
      await clearContactIssue(matchId);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

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
      <PageHeader backTo="/admin/leagues" backLabel="จัดการลีค" />
      <h1>ข้อพิพาทและคำขอ</h1>

      <form onSubmit={handleSearch} className="inline-search-form">
        <label>
          ค้นหาแมตช์ด้วยรหัส
          <input value={searchCode} onChange={(e) => setSearchCode(e.target.value)} placeholder="เช่น 7K4PXM" />
        </label>
        {searchError && <p className="form-error">{searchError}</p>}
        <button type="submit" className="btn-ghost">
          ค้นหา
        </button>
      </form>

      {error && <p className="form-error">{error}</p>}

      <h2>ข้อพิพาท (สกอร์ไม่ตรง)</h2>
      {matches === null && <Skeleton width="100%" height="80px" radius="14px" />}
      {matches?.length === 0 && <EmptyState compact icon={ShieldCheck} title="ไม่มีข้อพิพาทตอนนี้" />}

      <ul className="dispute-list">
        {matches?.map((m) => {
          const home = m.submissions[m.players.home];
          const away = m.submissions[m.players.away];
          return (
            <li key={m.id} className="dispute-card">
              <p className="dispute-card-header">
                <code>{m.matchCode}</code> <Link to={`/matches/${m.id}`}>ดูหน้าแมตช์</Link>
              </p>
              <div className="dispute-row">
                <span>
                  {profiles[m.players.home]?.displayName}: <strong>{home.scoreHome}-{home.scoreAway}</strong>
                  {home.penaltyHome != null && <> (จุดโทษ {home.penaltyHome}-{home.penaltyAway})</>}{" "}
                  {home.photoURL ? <Camera size={14} className="inline-icon" aria-label="มีรูปแนบ" /> : ""}
                </span>
                <button type="button" className="btn-ghost btn-sm" disabled={busyId === m.id} onClick={() => handleUseSubmission(m.id, m.players.home)}>
                  {busyId === m.id && <Spinner size="sm" />} ใช้ผลนี้
                </button>
              </div>
              <div className="dispute-row">
                <span>
                  {profiles[m.players.away]?.displayName}: <strong>{away.scoreHome}-{away.scoreAway}</strong>
                  {away.penaltyHome != null && <> (จุดโทษ {away.penaltyHome}-{away.penaltyAway})</>}{" "}
                  {away.photoURL ? <Camera size={14} className="inline-icon" aria-label="มีรูปแนบ" /> : ""}
                </span>
                <button type="button" className="btn-ghost btn-sm" disabled={busyId === m.id} onClick={() => handleUseSubmission(m.id, m.players.away)}>
                  {busyId === m.id && <Spinner size="sm" />} ใช้ผลนี้
                </button>
              </div>
              <button type="button" className="btn-ghost btn-sm" disabled={busyId === m.id} onClick={() => handleReplay(m.id)}>
                {busyId === m.id && <Spinner size="sm" />} ให้แข่งใหม่
              </button>
            </li>
          );
        })}
      </ul>

      <h2>ติดต่อคู่แข่งไม่ได้ (ถ้วย)</h2>
      {contactIssues === null && <Skeleton width="100%" height="80px" radius="14px" />}
      {contactIssues?.length === 0 && <EmptyState compact icon={Phone} title="ไม่มีคิวตอนนี้" />}
      <ul className="dispute-list">
        {contactIssues?.map((m) => (
          <li key={m.id} className="dispute-card">
            <p className="dispute-card-header">
              <code>{m.matchCode}</code> <Link to={`/matches/${m.id}`}>ดูหน้าแมตช์</Link>
            </p>
            <div className="dispute-row">
              <span>
                {profiles[m.players.home]?.displayName}
                {m.contactUnreachable?.[m.players.home] && <span className="status-badge status-orange"> กดติดต่อไม่ได้</span>}
              </span>
              <button type="button" className="btn-ghost btn-sm" disabled={busyId === m.id} onClick={() => handleGrantWalkover(m.id, m.players.home)}>
                {busyId === m.id && <Spinner size="sm" />} ให้ผ่านแบบชนะบาย
              </button>
            </div>
            <div className="dispute-row">
              <span>
                {profiles[m.players.away]?.displayName}
                {m.contactUnreachable?.[m.players.away] && <span className="status-badge status-orange"> กดติดต่อไม่ได้</span>}
              </span>
              <button type="button" className="btn-ghost btn-sm" disabled={busyId === m.id} onClick={() => handleGrantWalkover(m.id, m.players.away)}>
                {busyId === m.id && <Spinner size="sm" />} ให้ผ่านแบบชนะบาย
              </button>
            </div>
            <button type="button" className="btn-ghost btn-sm" disabled={busyId === m.id} onClick={() => handleClearContactIssue(m.id)}>
              {busyId === m.id && <Spinner size="sm" />} ยกเลิกคิวนี้ (ติดต่อได้แล้ว แข่งปกติ)
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
