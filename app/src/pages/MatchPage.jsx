import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { Copy, Check, MessageCircle, PhoneOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  subscribeToMatch,
  subscribeToLeagueMatches,
  toggleContactUnreachable,
  adminOverrideResult,
} from "../firebase/matches";
import { subscribeToLeague } from "../firebase/leagues";
import { submitMatchResult } from "../firebase/matchSubmission";
import { uploadMatchPhoto } from "../firebase/storageHelpers";
import { usePublicProfiles } from "../hooks/usePublicProfiles";
import useAnimationsReady from "../hooks/useAnimationsReady";
import { functions } from "../firebase/config";
import { useToast } from "../context/ToastContext";
import StatusBadge from "../components/StatusBadge";
import Spinner from "../components/Spinner";
import ScoreStepper from "../components/ScoreStepper";
import PhotoUploadField from "../components/PhotoUploadField";
import { roundLabel } from "../utils/roundLabel";
import PageHeader from "../components/PageHeader";

function Avatar({ photoURL, name, className = "match-vs-avatar" }) {
  return photoURL ? (
    <img src={photoURL} alt={name} className={className} />
  ) : (
    <span className={`${className} match-vs-avatar-fallback`}>{name?.[0] ?? "?"}</span>
  );
}

export default function MatchPage() {
  const { matchId } = useParams();
  const { user, profile } = useAuth();
  const showToast = useToast();
  const animReady = useAnimationsReady();
  const [match, setMatch] = useState(undefined);
  const [league, setLeague] = useState(undefined);
  const [leagueMatches, setLeagueMatches] = useState([]);
  const [myScore, setMyScore] = useState("");
  const [oppScore, setOppScore] = useState("");
  const [usePenalty, setUsePenalty] = useState(false);
  const [myPenalty, setMyPenalty] = useState("");
  const [oppPenalty, setOppPenalty] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreviewURL, setPhotoPreviewURL] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contactInfo, setContactInfo] = useState(null);
  const [overrideHome, setOverrideHome] = useState("");
  const [overrideAway, setOverrideAway] = useState("");
  const [overridePenHome, setOverridePenHome] = useState("");
  const [overridePenAway, setOverridePenAway] = useState("");

  useEffect(() => subscribeToMatch(matchId, setMatch), [matchId]);
  useEffect(() => {
    if (match?.leagueId) return subscribeToLeague(match.leagueId, setLeague);
  }, [match?.leagueId]);
  // ใช้ดูสถิติเจอกัน (head-to-head) เท่านั้น — ใช้ subscription ที่มีอยู่แล้ว ไม่สร้าง query ใหม่
  useEffect(() => {
    if (match?.leagueId) return subscribeToLeagueMatches(match.leagueId, setLeagueMatches);
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
    if (!mine) return;
    const raf = requestAnimationFrame(() => {
      const myVal = isHome ? mine.scoreHome : mine.scoreAway;
      const oppVal = isHome ? mine.scoreAway : mine.scoreHome;
      setMyScore(String(myVal));
      setOppScore(String(oppVal));
      if (mine.penaltyHome != null) {
        setUsePenalty(true);
        setMyPenalty(String(isHome ? mine.penaltyHome : mine.penaltyAway));
        setOppPenalty(String(isHome ? mine.penaltyAway : mine.penaltyHome));
      }
      setPhotoPreviewURL(mine.photoURL ?? null);
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.id]);

  const isTied = useMemo(() => {
    const a = Number(myScore);
    const b = Number(oppScore);
    return myScore !== "" && oppScore !== "" && a === b;
  }, [myScore, oppScore]);

  // สถิติเจอกัน — นับเฉพาะแมตช์ปกติที่จบแล้ว (อนุมัติ/ชนะบาย) ระหว่างสองคนนี้ในลีคเดียวกัน ไม่รวมแมตช์ปัจจุบัน
  const headToHead = useMemo(() => {
    if (!match || !opponentUid) return null;
    let myWins = 0;
    let oppWins = 0;
    let draws = 0;
    for (const m of leagueMatches) {
      if (m.id === match.id || m.kind !== "regular") continue;
      const { home, away } = m.players;
      const isThisPair = (home === user.uid && away === opponentUid) || (home === opponentUid && away === user.uid);
      if (!isThisPair) continue;

      let winnerUid = null;
      if (m.status === "approved") {
        const { scoreHome, scoreAway, penaltyHome, penaltyAway } = m.approvedResult;
        if (scoreHome !== scoreAway) winnerUid = scoreHome > scoreAway ? home : away;
        else if (penaltyHome != null) winnerUid = penaltyHome > penaltyAway ? home : away;
      } else if (m.status === "walkover") {
        winnerUid = m.walkover.winnerUid;
      } else {
        continue;
      }
      if (winnerUid == null) draws++;
      else if (winnerUid === user.uid) myWins++;
      else oppWins++;
    }
    const total = myWins + oppWins + draws;
    if (total === 0) return null;
    return { total, myWins, oppWins, draws };
  }, [leagueMatches, match, opponentUid, user.uid]);

  async function handleCopyCode() {
    await navigator.clipboard.writeText(match.matchCode);
    showToast("คัดลอกแล้ว", "success");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handlePhotoChange(file) {
    setPhotoFile(file);
    setPhotoPreviewURL(file ? URL.createObjectURL(file) : (mySubmission?.photoURL ?? null));
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
      setJustSubmitted(true);
      if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
      setTimeout(() => setJustSubmitted(false), 1600);
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

  const homeSubmission = match.submissions?.[match.players.home];
  const awaySubmission = match.submissions?.[match.players.away];
  const bothSubmitted = !!(homeSubmission && awaySubmission);
  // กันผู้เล่นเห็นเลขที่คู่แข่งส่งก่อนตัวเองส่ง (เลี่ยง bias) — แต่แอดมินเห็นได้เสมอ จะได้ตัดสินแทนได้ถ้าอีกฝั่งลืมส่ง
  const showSubmissions = isAdmin || bothSubmitted;

  // พรีวิวผลสดก่อนกดส่ง — ใครชนะ/เสมอตามเลขที่กรอกอยู่ตอนนี้ (ยังไม่ส่งจริง)
  const previewReady = myScore !== "" && oppScore !== "";
  const myValPreview = Number(myScore);
  const oppValPreview = Number(oppScore);
  const previewWinner = previewReady ? (myValPreview > oppValPreview ? "me" : myValPreview < oppValPreview ? "opp" : "draw") : null;

  let h2hText = null;
  if (headToHead) {
    const { total, myWins, oppWins, draws } = headToHead;
    const lead =
      myWins > oppWins
        ? `คุณนำ ${myWins}-${oppWins}`
        : myWins < oppWins
          ? `คู่แข่งนำ ${oppWins}-${myWins}`
          : `เสมอกัน ${myWins}-${oppWins}`;
    h2hText = `เจอกัน ${total} ครั้ง · ${lead}${draws > 0 ? ` (เสมอ ${draws})` : ""}`;
  }

  return (
    <div className="page">
      <PageHeader backTo={`/leagues/${match.leagueId}`} backLabel="กลับลีค" />

      <div className="match-header">
        <div className="match-header-top">
          <span className="match-code-chip">
            <code>{match.matchCode}</code>
            <button type="button" className="match-code-copy-btn" onClick={handleCopyCode} aria-label="คัดลอกรหัสแมตช์">
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </span>
          <StatusBadge status={match.status} />
        </div>
        <p>
          {league?.name}
          {match.round != null && <> · {roundLabel(league?.size, match.round)}</>}
          {match.leg != null && <> · แมตช์ที่ {match.leg}</>}
        </p>
      </div>

      {isParticipant && (
        <div className={`match-vs-arena ${animReady ? "match-vs-arena-go" : "match-vs-arena-wait"}`}>
          <div className="match-vs-side match-vs-side-left">
            <span className="match-vs-side-bg" aria-hidden="true" />
            <span className="match-vs-you-badge">คุณ</span>
            <Avatar photoURL={profile?.photoURL} name={myName} />
            <span className="match-vs-name">{myName}</span>
            {mySubmission && <span className="chip chip-accent match-vs-status">ส่งผลแล้ว</span>}
          </div>

          <div className="match-vs-center">
            <span className="match-vs-versus-big" aria-hidden="true">
              VS
            </span>
            {h2hText && <p className="match-vs-h2h">{h2hText}</p>}
          </div>

          <div className="match-vs-side match-vs-side-right">
            <span className="match-vs-side-bg" aria-hidden="true" />
            <Avatar photoURL={profiles[opponentUid]?.photoURL} name={opponentName} />
            <span className="match-vs-name">{opponentName}</span>
            {opponentSubmission && <span className="chip chip-accent-2 match-vs-status">ส่งผลแล้ว</span>}
          </div>
        </div>
      )}

      {isParticipant && (
        <div className="match-actions">
          <button type="button" className="btn-ghost btn-sm match-action-btn" onClick={handleContactOpponent}>
            <MessageCircle size={15} aria-hidden="true" /> ติดต่อคู่แข่ง
          </button>
          {canUseContactButton && match.status !== "walkover" && (
            <button type="button" className="btn-ghost btn-sm match-action-btn" onClick={handleToggleUnreachable}>
              <PhoneOff size={15} aria-hidden="true" />
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
          <Check size={18} aria-hidden="true" className="match-result-check" />
          ผลอนุมัติแล้ว: {match.approvedResult.scoreHome} - {match.approvedResult.scoreAway}
          {match.approvedResult.penaltyHome != null && (
            <>
              {" "}
              (จุดโทษ {match.approvedResult.penaltyHome}-{match.approvedResult.penaltyAway})
            </>
          )}
          {justApproved && <span className="match-result-confirmed-text">ผลได้รับการยืนยัน!</span>}
        </div>
      )}

      {match.status === "walkover" && (
        <div className="match-result-banner status-green">
          ชนะบาย: {profiles[match.walkover.winnerUid]?.displayName} (ไม่ใช่ผลแข่งจริง)
        </div>
      )}

      {match.status === "disputed" && (
        <div className="match-result-banner status-orange match-disputed-banner">สกอร์ที่ส่งมาไม่ตรงกัน รอแอดมินตรวจสอบและตัดสินผล</div>
      )}

      {isAdmin && match.status === "one_submitted" && (
        <p className="status-badge status-yellow match-hint">
          {homeSubmission ? profiles[match.players.home]?.displayName : profiles[match.players.away]?.displayName}
          {" "}ส่งผลแล้ว รออีกฝั่งส่งอยู่ — ถ้ารอนานเกินไป ตัดสินผลแทนได้ที่ฟอร์มด้านล่าง
        </p>
      )}

      {showSubmissions && (homeSubmission || awaySubmission) && (
        <div className="submission-compare">
          {homeSubmission && (
            <div className="submission-row">
              <p>
                ผลที่ {profiles[match.players.home]?.displayName} ส่ง: {homeSubmission.scoreHome}-{homeSubmission.scoreAway}
                {homeSubmission.penaltyHome != null && (
                  <> (จุดโทษ {homeSubmission.penaltyHome}-{homeSubmission.penaltyAway})</>
                )}
              </p>
              {homeSubmission.photoURL && (
                <a href={homeSubmission.photoURL} target="_blank" rel="noreferrer" className="submission-photo-link">
                  <img src={homeSubmission.photoURL} alt="" className="submission-photo" />
                </a>
              )}
            </div>
          )}
          {awaySubmission && (
            <div className="submission-row">
              <p>
                ผลที่ {profiles[match.players.away]?.displayName} ส่ง: {awaySubmission.scoreHome}-{awaySubmission.scoreAway}
                {awaySubmission.penaltyHome != null && (
                  <> (จุดโทษ {awaySubmission.penaltyHome}-{awaySubmission.penaltyAway})</>
                )}
              </p>
              {awaySubmission.photoURL && (
                <a href={awaySubmission.photoURL} target="_blank" rel="noreferrer" className="submission-photo-link">
                  <img src={awaySubmission.photoURL} alt="" className="submission-photo" />
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {editable && (
        <form onSubmit={handleSubmit} className="match-score-form">
          <h2>ส่งผล</h2>

          <div className="score-zone">
            <div className="score-zone-side">
              <Avatar photoURL={profile?.photoURL} name={myName} className="score-zone-avatar" />
              <span className="score-zone-name">{myName}</span>
              <ScoreStepper label={myName} value={myScore} onChange={setMyScore} required />
            </div>
            <span className="score-stepper-divider score-zone-divider">:</span>
            <div className="score-zone-side">
              <Avatar photoURL={profiles[opponentUid]?.photoURL} name={opponentName} className="score-zone-avatar" />
              <span className="score-zone-name">{opponentName}</span>
              <ScoreStepper label={opponentName} value={oppScore} onChange={setOppScore} required />
            </div>
          </div>

          {previewReady && (
            <p className={`score-preview score-preview-${previewWinner}`}>
              <span className={previewWinner === "me" ? "score-preview-winner" : ""}>{myName}</span> {myScore} - {oppScore}{" "}
              <span className={previewWinner === "opp" ? "score-preview-winner" : ""}>{opponentName}</span>
              {previewWinner === "draw" && <span className="score-preview-draw-tag">เสมอ</span>}
            </p>
          )}

          {needsPenalty && (
            <div className={`penalty-box ${showPenaltyBox ? "penalty-box-open" : ""}`}>
              <label className="checkbox-label">
                <input type="checkbox" checked={usePenalty} onChange={(e) => setUsePenalty(e.target.checked)} />
                <span aria-hidden="true">⚽</span> เข้าสู่การยิงจุดโทษ
              </label>
              <div className={`penalty-fields ${usePenalty ? "penalty-fields-open" : ""}`}>
                <ScoreStepper label="จุดโทษของฉัน" value={myPenalty} onChange={setMyPenalty} />
                <ScoreStepper label="จุดโทษคู่แข่ง" value={oppPenalty} onChange={setOppPenalty} />
              </div>
            </div>
          )}

          <PhotoUploadField
            previewURL={photoPreviewURL}
            isNewFile={!!photoFile}
            fileName={photoFile?.name}
            onChange={handlePhotoChange}
          />

          {!mySubmission && opponentSubmission && (
            <p className="status-badge status-yellow match-hint status-badge-pulse">คู่แข่งส่งผลแล้ว รอคุณยืนยัน</p>
          )}
          {mySubmission && !opponentSubmission && (
            <p className="status-badge status-yellow match-hint status-badge-pulse">ส่งผลแล้ว รอคู่แข่งยืนยัน</p>
          )}

          <p className="hint-text match-edit-hint">แก้ไขได้จนกว่าผลจะถูกอนุมัติ</p>

          <button type="submit" className={`btn-primary match-submit-btn ${justSubmitted ? "match-submit-success" : ""}`} disabled={submitting}>
            {submitting && <Spinner size="sm" />}
            {justSubmitted ? (
              <Check size={18} className="match-submit-check" aria-hidden="true" />
            ) : submitting ? (
              "กำลังส่ง..."
            ) : mySubmission ? (
              "แก้ไขผล"
            ) : (
              "ส่งผล"
            )}
          </button>
        </form>
      )}

      {isAdmin && (
        <form onSubmit={handleAdminOverride}>
          <h2>{match.status === "approved" || match.status === "walkover" ? "แก้ไขผลโดยตรง (แอดมิน)" : "ตัดสินผลแมตช์นี้ (แอดมิน)"}</h2>
          {match.status !== "approved" && match.status !== "walkover" && (
            <p className="hint-text">ใช้ตัดสินได้เลยถ้าผู้เล่นอีกฝั่งไม่ส่งผลหรือติดต่อไม่ได้ ไม่ต้องรอให้ทั้งสองฝั่งส่งก่อน</p>
          )}
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
