import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { useAuth } from "../context/AuthContext";
import { subscribeToMatch } from "../firebase/matches";
import { subscribeToLeague } from "../firebase/leagues";
import { submitMatchResult } from "../firebase/matchSubmission";
import { uploadMatchPhoto } from "../firebase/storageHelpers";
import { usePublicProfiles } from "../hooks/usePublicProfiles";
import { functions } from "../firebase/config";

const STATUS_LABEL = {
  scheduled: "ยังไม่แข่ง",
  one_submitted: "ส่งผลแล้วฝ่ายเดียว รออีกฝ่าย",
  disputed: "สกอร์ไม่ตรง รอแอดมินตัดสิน",
  approved: "จบแล้ว",
  walkover: "ชนะบาย",
};

export default function MatchPage() {
  const { matchId } = useParams();
  const { user } = useAuth();
  const [match, setMatch] = useState(undefined);
  const [league, setLeague] = useState(undefined);
  const [myScore, setMyScore] = useState("");
  const [oppScore, setOppScore] = useState("");
  const [usePenalty, setUsePenalty] = useState(false);
  const [myPenalty, setMyPenalty] = useState("");
  const [oppPenalty, setOppPenalty] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [contactInfo, setContactInfo] = useState(null);

  useEffect(() => subscribeToMatch(matchId, setMatch), [matchId]);
  useEffect(() => {
    if (match?.leagueId) return subscribeToLeague(match.leagueId, setLeague);
  }, [match?.leagueId]);

  const profiles = usePublicProfiles(match ? [match.players.home, match.players.away] : []);

  const isHome = match?.players.home === user.uid;
  const isParticipant = match && (isHome || match.players.away === user.uid);
  const opponentUid = match ? (isHome ? match.players.away : match.players.home) : null;
  const needsPenalty = league?.format === "cup" || match?.kind === "tiebreaker";

  useEffect(() => {
    if (!match || !isParticipant) return;
    const mine = match.submissions?.[user.uid];
    if (mine) {
      const myVal = isHome ? mine.scoreHome : mine.scoreAway;
      const oppVal = isHome ? mine.scoreAway : mine.scoreHome;
      setMyScore(String(myVal));
      setOppScore(String(oppVal));
      if (mine.penaltyHome != null) {
        setUsePenalty(true);
        setMyPenalty(String(isHome ? mine.penaltyHome : mine.penaltyAway));
        setOppPenalty(String(isHome ? mine.penaltyAway : mine.penaltyHome));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.id]);

  const isTied = useMemo(() => {
    const a = Number(myScore);
    const b = Number(oppScore);
    return myScore !== "" && oppScore !== "" && a === b;
  }, [myScore, oppScore]);

  async function handleCopyCode() {
    await navigator.clipboard.writeText(match.matchCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleContactOpponent() {
    setError("");
    try {
      const fn = httpsCallable(functions, "getOpponentContact");
      const res = await fn({ matchId });
      setContactInfo(res.data);
      if (res.data.facebookUrl) window.open(res.data.facebookUrl, "_blank");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const myVal = Number(myScore);
    const oppVal = Number(oppScore);
    if (!Number.isInteger(myVal) || myVal < 0 || !Number.isInteger(oppVal) || oppVal < 0) {
      return setError("สกอร์ต้องเป็นจำนวนเต็มไม่ติดลบ");
    }

    let penaltyMine = null;
    let penaltyOpp = null;
    if (needsPenalty && isTied) {
      if (!usePenalty) return setError("สกอร์เสมอ ต้องติ๊ก \"เข้าสู่การยิงจุดโทษ\" และกรอกผล");
      penaltyMine = Number(myPenalty);
      penaltyOpp = Number(oppPenalty);
      if (!Number.isInteger(penaltyMine) || penaltyMine < 0 || !Number.isInteger(penaltyOpp) || penaltyOpp < 0) {
        return setError("สกอร์จุดโทษต้องเป็นจำนวนเต็มไม่ติดลบ");
      }
      if (penaltyMine === penaltyOpp) return setError("สกอร์จุดโทษห้ามเท่ากัน ต้องมีผู้ชนะ");
    }

    setSubmitting(true);
    try {
      let photoURL = match.submissions?.[user.uid]?.photoURL ?? null;
      if (photoFile) {
        photoURL = await uploadMatchPhoto(matchId, photoFile);
      }

      await submitMatchResult(matchId, user.uid, {
        scoreHome: isHome ? myVal : oppVal,
        scoreAway: isHome ? oppVal : myVal,
        penaltyHome: penaltyMine == null ? null : isHome ? penaltyMine : penaltyOpp,
        penaltyAway: penaltyMine == null ? null : isHome ? penaltyOpp : penaltyMine,
        photoURL,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (match === undefined || league === undefined) return <p>กำลังโหลด...</p>;
  if (match === null) return <p>ไม่พบแมตช์นี้</p>;

  const opponentName = profiles[opponentUid]?.displayName ?? "...";
  const mySubmission = match.submissions?.[user.uid];
  const opponentSubmission = opponentUid ? match.submissions?.[opponentUid] : null;
  const editable = isParticipant && match.status !== "approved";

  return (
    <div className="page">
      <Link to={`/leagues/${match.leagueId}`}>← กลับลีค</Link>
      <h1>แมตช์</h1>

      <p>
        รหัสแมตช์: <code>{match.matchCode}</code>{" "}
        <button type="button" onClick={handleCopyCode}>
          {copied ? "คัดลอกแล้ว" : "คัดลอก"}
        </button>
      </p>
      <p>
        ลีค: {league?.name}
        {match.round != null && <> — รอบ {match.round}</>}
        {match.leg != null && <> — นัดที่ {match.leg}</>}
      </p>

      {isParticipant && (
        <>
          <p>คู่แข่ง: {opponentName}</p>
          <button type="button" onClick={handleContactOpponent}>
            ติดต่อคู่แข่ง
          </button>
          {contactInfo && !contactInfo.facebookUrl && (
            <p>ชื่อเฟซบุ๊กคู่แข่ง: {contactInfo.facebookName ?? "ไม่มีข้อมูล"}</p>
          )}
        </>
      )}

      <p>สถานะ: {STATUS_LABEL[match.status]}</p>
      {error && <p className="form-error">{error}</p>}

      {match.status === "approved" && (
        <p>
          ผลอนุมัติแล้ว: {match.approvedResult.scoreHome} - {match.approvedResult.scoreAway}
          {match.approvedResult.penaltyHome != null && (
            <> (จุดโทษ {match.approvedResult.penaltyHome}-{match.approvedResult.penaltyAway})</>
          )}
        </p>
      )}

      {(match.status === "disputed" || match.status === "approved") && mySubmission && opponentSubmission && (
        <div>
          <p>
            ผลที่ {profiles[match.players.home]?.displayName} ส่ง: {match.submissions[match.players.home].scoreHome}-
            {match.submissions[match.players.home].scoreAway}
          </p>
          <p>
            ผลที่ {profiles[match.players.away]?.displayName} ส่ง: {match.submissions[match.players.away].scoreHome}-
            {match.submissions[match.players.away].scoreAway}
          </p>
        </div>
      )}

      {editable && (
        <form onSubmit={handleSubmit}>
          <label>
            สกอร์ของฉัน
            <input type="number" min={0} value={myScore} onChange={(e) => setMyScore(e.target.value)} required />
          </label>
          <label>
            สกอร์คู่แข่ง
            <input type="number" min={0} value={oppScore} onChange={(e) => setOppScore(e.target.value)} required />
          </label>

          {needsPenalty && isTied && (
            <>
              <label>
                <input type="checkbox" checked={usePenalty} onChange={(e) => setUsePenalty(e.target.checked)} />
                เข้าสู่การยิงจุดโทษ
              </label>
              {usePenalty && (
                <>
                  <label>
                    จุดโทษของฉัน
                    <input type="number" min={0} value={myPenalty} onChange={(e) => setMyPenalty(e.target.value)} />
                  </label>
                  <label>
                    จุดโทษคู่แข่ง
                    <input type="number" min={0} value={oppPenalty} onChange={(e) => setOppPenalty(e.target.value)} />
                  </label>
                </>
              )}
            </>
          )}

          <label>
            แนบรูป (ไม่บังคับ)
            <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
          </label>

          {!mySubmission && opponentSubmission && <p>คู่แข่งส่งผลแล้ว รอคุณยืนยัน</p>}
          {mySubmission && !opponentSubmission && <p>ส่งผลแล้ว รอคู่แข่งยืนยัน</p>}

          <p>แก้ไขได้จนกว่าผลจะถูกอนุมัติ</p>

          <button type="submit" disabled={submitting}>
            {submitting ? "กำลังส่ง..." : mySubmission ? "แก้ไขผล" : "ส่งผล"}
          </button>
        </form>
      )}
    </div>
  );
}
