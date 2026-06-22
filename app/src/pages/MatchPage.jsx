import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { useAuth } from "../context/AuthContext";
import { subscribeToMatch, toggleContactUnreachable, adminOverrideResult } from "../firebase/matches";
import { subscribeToLeague } from "../firebase/leagues";
import { submitMatchResult } from "../firebase/matchSubmission";
import { uploadMatchPhoto } from "../firebase/storageHelpers";
import { usePublicProfiles } from "../hooks/usePublicProfiles";
import { functions } from "../firebase/config";
import { useToast } from "../context/ToastContext";
import StatusBadge from "../components/StatusBadge";
import Spinner from "../components/Spinner";
import ScoreStepper from "../components/ScoreStepper";
import { roundLabel } from "../utils/roundLabel";
import BackLink from "../components/BackLink";

function Avatar({ photoURL, name }) {
  return photoURL ? (
    <img src={photoURL} alt={name} className="match-vs-avatar" />
  ) : (
    <span className="match-vs-avatar match-vs-avatar-fallback">{name?.[0] ?? "?"}</span>
  );
}

export default function MatchPage() {
  const { matchId } = useParams();
  const { user, profile } = useAuth();
  const showToast = useToast();
  const [match, setMatch] = useState(undefined);
  const [league, setLeague] = useState(undefined);
  const [myScore, setMyScore] = useState("");
  const [oppScore, setOppScore] = useState("");
  const [usePenalty, setUsePenalty] = useState(false);
  const [myPenalty, setMyPenalty] = useState("");
  const [oppPenalty, setOppPenalty] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [contactInfo, setContactInfo] = useState(null);
  const [overrideHome, setOverrideHome] = useState("");
  const [overrideAway, setOverrideAway] = useState("");
  const [overridePenHome, setOverridePenHome] = useState("");
  const [overridePenAway, setOverridePenAway] = useState("");

  useEffect(() => subscribeToMatch(matchId, setMatch), [matchId]);
  useEffect(() => {
    if (match?.leagueId) return subscribeToLeague(match.leagueId, setLeague);
  }, [match?.leagueId]);

  const profiles = usePublicProfiles(match ? [match.players.home, match.players.away] : []);

  const isHome = match?.players.home === user.uid;
  const isParticipant = match && (isHome || match.players.away === user.uid);
  const opponentUid = match ? (isHome ? match.players.away : match.players.home) : null;
  const needsPenalty = league?.format === "cup" || match?.kind === "tiebreaker";

  // จับจังหวะ "ผลอนุมัติตรงกันอัตโนมัติ" สด ๆ ตอนเปิดหน้าอยู่ — เฉพาะ decidedBy:"auto" เท่านั้น
  // (ไม่ฉลองตอนแอดมินตัดสินข้อพิพาท เพราะนั่นไม่ใช่ช่วงเวลาที่ควรรู้สึกฟิน)
  const prevStatusRef = useRef(undefined);
  const [justApproved, setJustApproved] = useState(false);
  useEffect(() => {
    if (!match) return;
    const prevStatus = prevStatusRef.current;
    if (prevStatus != null && prevStatus !== "approved" && match.status === "approved" && match.approvedResult?.decidedBy === "auto") {
      setJustApproved(true);
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (!reduceMotion) {
        // โหลด canvas-confetti แบบ lazy ตอนจะใช้จริงเท่านั้น ไม่ให้ไปอยู่ใน bundle หลัก
        import("canvas-confetti").then(({ default: confetti }) => {
          confetti({ particleCount: 50, spread: 55, scalar: 0.8, origin: { y: 0.55 }, ticks: 110 });
        });
      }
      if (navigator.vibrate) navigator.vibrate(60);
      setTimeout(() => setJustApproved(false), 1200);
    }
    prevStatusRef.current = match.status;
  }, [match?.status, match?.approvedResult]);

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
    showToast("คัดลอกรหัสแล้ว", "success");
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

  async function handleToggleUnreachable() {
    setError("");
    try {
      await toggleContactUnreachable(matchId, user.uid);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAdminOverride(e) {
    e.preventDefault();
    setError("");
    const sH = Number(overrideHome);
    const sA = Number(overrideAway);
    if (!Number.isInteger(sH) || sH < 0 || !Number.isInteger(sA) || sA < 0) {
      return setError("สกอร์ต้องเป็นจำนวนเต็มไม่ติดลบ");
    }
    let pH = null;
    let pA = null;
    if (sH === sA) {
      pH = Number(overridePenHome);
      pA = Number(overridePenAway);
      if (!Number.isInteger(pH) || pH < 0 || !Number.isInteger(pA) || pA < 0) {
        return setError("สกอร์เสมอ ต้องกรอกจุดโทษเป็นจำนวนเต็มไม่ติดลบ");
      }
      if (pH === pA) return setError("สกอร์จุดโทษห้ามเท่ากัน");
    }
    try {
      await adminOverrideResult(matchId, { scoreHome: sH, scoreAway: sA, penaltyHome: pH, penaltyAway: pA });
      showToast("บันทึกผลแล้ว", "success");
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
      if (!usePenalty) return setError('สกอร์เสมอ ต้องติ๊ก "เข้าสู่การยิงจุดโทษ" และกรอกผล');
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
      showToast("ส่งผลแล้ว", "success");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (match === undefined || league === undefined)
    return (
      <div className="page-loader">
        <Spinner size="lg" />
      </div>
    );
  if (match === null) return <p>ไม่พบแมตช์นี้</p>;

  const opponentName = profiles[opponentUid]?.displayName ?? "...";
  const myName = profile?.displayName ?? "ฉัน";
  const mySubmission = match.submissions?.[user.uid];
  const opponentSubmission = opponentUid ? match.submissions?.[opponentUid] : null;
  const editable = isParticipant && match.status !== "approved" && match.status !== "walkover";
  const canUseContactButton = league?.format === "cup" && match.kind === "regular" && isParticipant;
  const iAmUnreachableFlag = !!match.contactUnreachable?.[user.uid];
  const isAdmin = profile?.role === "admin";
  const showPenaltyBox = needsPenalty && isTied;

  return (
    <div className="page">
      <BackLink to={`/leagues/${match.leagueId}`}>กลับลีค</BackLink>

      <div className="match-header">
        <div className="match-header-top">
          <code>{match.matchCode}</code>
          <button type="button" className="btn-ghost btn-sm" onClick={handleCopyCode}>
            คัดลอกรหัส
          </button>
          <StatusBadge status={match.status} />
        </div>
        <p>
          {league?.name}
          {match.round != null && <> · {roundLabel(league?.size, match.round)}</>}
          {match.leg != null && <> · แมตช์ที่ {match.leg}</>}
        </p>
      </div>

      {isParticipant && (
        <div className="match-vs">
          <div className="match-vs-side">
            <Avatar photoURL={profile?.photoURL} name={myName} />
            <span className="match-vs-name">{myName}</span>
            {mySubmission && <span className="chip chip-accent match-vs-status">ส่งผลแล้ว</span>}
          </div>
          <span className="match-vs-versus">VS</span>
          <div className="match-vs-side">
            <Avatar photoURL={profiles[opponentUid]?.photoURL} name={opponentName} />
            <span className="match-vs-name">{opponentName}</span>
            {opponentSubmission && <span className="chip chip-accent-2 match-vs-status">ส่งผลแล้ว</span>}
          </div>
        </div>
      )}

      {isParticipant && (
        <div className="match-actions">
          <button type="button" className="btn-ghost btn-sm" onClick={handleContactOpponent}>
            ติดต่อคู่แข่ง
          </button>
          {canUseContactButton && match.status !== "walkover" && (
            <button type="button" className="btn-ghost btn-sm" onClick={handleToggleUnreachable}>
              {iAmUnreachableFlag ? "ยกเลิกแจ้งติดต่อไม่ได้" : "ติดต่อคู่แข่งไม่ได้"}
            </button>
          )}
        </div>
      )}
      {contactInfo && !contactInfo.facebookUrl && <p>ชื่อเฟซบุ๊กคู่แข่ง: {contactInfo.facebookName ?? "ไม่มีข้อมูล"}</p>}
      {iAmUnreachableFlag && <p>แจ้งแอดมินแล้วว่าติดต่อคู่แข่งไม่ได้ รอแอดมินดำเนินการ</p>}

      {error && <p className="form-error">{error}</p>}

      {match.status === "approved" && (
        <div className={`match-result-banner status-green ${justApproved ? "match-result-flash" : ""}`}>
          ผลอนุมัติแล้ว: {match.approvedResult.scoreHome} - {match.approvedResult.scoreAway}
          {match.approvedResult.penaltyHome != null && (
            <>
              {" "}
              (จุดโทษ {match.approvedResult.penaltyHome}-{match.approvedResult.penaltyAway})
            </>
          )}
        </div>
      )}

      {match.status === "walkover" && (
        <div className="match-result-banner status-green">
          ชนะบาย: {profiles[match.walkover.winnerUid]?.displayName} (ไม่ใช่ผลแข่งจริง)
        </div>
      )}

      {(match.status === "disputed" || match.status === "approved") && mySubmission && opponentSubmission && (
        <div className="submission-compare">
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
          <h2>ส่งผล</h2>
          <div className="score-stepper-row">
            <ScoreStepper label="สกอร์ของฉัน" value={myScore} onChange={setMyScore} required />
            <span className="score-stepper-divider">:</span>
            <ScoreStepper label="สกอร์คู่แข่ง" value={oppScore} onChange={setOppScore} required />
          </div>

          {needsPenalty && (
            <div className={`penalty-box ${showPenaltyBox ? "penalty-box-open" : ""}`}>
              <label className="checkbox-label">
                <input type="checkbox" checked={usePenalty} onChange={(e) => setUsePenalty(e.target.checked)} />
                เข้าสู่การยิงจุดโทษ
              </label>
              <div className={`penalty-fields ${usePenalty ? "penalty-fields-open" : ""}`}>
                <ScoreStepper label="จุดโทษของฉัน" value={myPenalty} onChange={setMyPenalty} />
                <ScoreStepper label="จุดโทษคู่แข่ง" value={oppPenalty} onChange={setOppPenalty} />
              </div>
            </div>
          )}

          <label>
            แนบรูป (ไม่บังคับ)
            <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
          </label>

          {!mySubmission && opponentSubmission && (
            <p className="status-badge status-yellow match-hint">คู่แข่งส่งผลแล้ว รอคุณยืนยัน</p>
          )}
          {mySubmission && !opponentSubmission && (
            <p className="status-badge status-yellow match-hint">ส่งผลแล้ว รอคู่แข่งยืนยัน</p>
          )}

          <p className="hint-text">แก้ไขได้จนกว่าผลจะถูกอนุมัติ</p>

          <button type="submit" disabled={submitting}>
            {submitting && <Spinner size="sm" />}
            {submitting ? "กำลังส่ง..." : mySubmission ? "แก้ไขผล" : "ส่งผล"}
          </button>
        </form>
      )}

      {isAdmin && (match.status === "approved" || match.status === "walkover") && (
        <form onSubmit={handleAdminOverride}>
          <h2>แก้ไขผลโดยตรง (แอดมิน)</h2>
          <div className="score-stepper-row">
            <ScoreStepper
              label={`สกอร์ ${profiles[match.players.home]?.displayName ?? ""} (เหย้า)`}
              value={overrideHome}
              onChange={setOverrideHome}
            />
            <span className="score-stepper-divider">:</span>
            <ScoreStepper
              label={`สกอร์ ${profiles[match.players.away]?.displayName ?? ""} (เยือน)`}
              value={overrideAway}
              onChange={setOverrideAway}
            />
          </div>
          <p className="hint-text">กรอกจุดโทษด้านล่างด้วย ถ้าสกอร์เสมอ</p>
          <div className="score-stepper-row">
            <ScoreStepper label="จุดโทษเหย้า" value={overridePenHome} onChange={setOverridePenHome} />
            <span className="score-stepper-divider">:</span>
            <ScoreStepper label="จุดโทษเยือน" value={overridePenAway} onChange={setOverridePenAway} />
          </div>
          <button type="submit" className="btn-ghost">
            บันทึกผล
          </button>
        </form>
      )}
    </div>
  );
}
