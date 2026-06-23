import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Crown, Play, SkipForward } from "lucide-react";
import { computeBracketLayout, computeTeamPaths, scoreLabel, winnerUidOf } from "../utils/bracketLayout";
import { roundLabel } from "../utils/roundLabel";
import { getStoredSkipAnimation, prefersReducedMotion, setStoredSkipAnimation } from "../utils/animationPrefs";
import CupTrophy from "./CupTrophy";

const UNIT_PX = 96; // ความสูงต่อช่องของรอบแรกฝั่งใดฝั่งหนึ่ง (รอบลึกขึ้นเว้นห่างเป็น 2x, 4x, ... อัตโนมัติด้วย justify-content: space-around)
const STAGGER_MS = 380; // ระยะห่างจังหวะเริ่มวาดของแต่ละรอบ (ไล่ทีละรอบ)
const DRAW_MS = 480; // ระยะเวลาที่เส้นแต่ละช่วงใช้วาดจนเต็ม
const CELEBRATE_MS = 900;

function winnerSideOf(m) {
  const uid = winnerUidOf(m);
  if (uid == null) return null;
  return uid === m.players.home ? "home" : "away";
}

function TeamAvatar({ photoURL, name }) {
  return photoURL ? (
    <img src={photoURL} alt="" className="cup-team-avatar" />
  ) : (
    <span className="cup-team-avatar cup-team-avatar-fallback" aria-hidden="true">
      {name?.[0] ?? "?"}
    </span>
  );
}

function TeamRow({ profile, label, isWinner, isChampionSide, placeholder, boxRef }) {
  if (placeholder) {
    return (
      <div className="cup-team cup-team-placeholder">
        <div className="cup-team-top">
          <span className="cup-team-avatar cup-team-avatar-fallback" aria-hidden="true">
            ?
          </span>
        </div>
        <span className="cup-team-name">รอทีม</span>
      </div>
    );
  }
  return (
    <div className={`cup-team ${isWinner ? "cup-team-winner" : ""} ${isChampionSide ? "cup-team-champion-side" : ""}`}>
      <div className="cup-team-top" ref={boxRef}>
        <TeamAvatar photoURL={profile?.photoURL} name={profile?.displayName} />
        <span className="cup-team-score">{label}</span>
      </div>
      <span className="cup-team-name">{profile?.displayName ?? "..."}</span>
    </div>
  );
}

function MatchBox({ slot, profiles, championUid, registerBox }) {
  const { match, round } = slot;
  if (!match) {
    return (
      <div className="cup-match cup-match-placeholder">
        <TeamRow placeholder />
        <TeamRow placeholder />
      </div>
    );
  }
  const winner = winnerSideOf(match);
  const winnerUid = winner === "home" ? match.players.home : winner === "away" ? match.players.away : null;
  const isChampionMatch = championUid != null && winnerUid === championUid;
  return (
    <Link to={`/matches/${match.id}`} className="cup-match">
      <TeamRow
        profile={profiles[match.players.home]}
        label={scoreLabel("home", match)}
        isWinner={winner === "home"}
        isChampionSide={isChampionMatch && winner === "home"}
        boxRef={(el) => registerBox(`${round}-${match.players.home}`, el)}
      />
      <TeamRow
        profile={profiles[match.players.away]}
        label={scoreLabel("away", match)}
        isWinner={winner === "away"}
        isChampionSide={isChampionMatch && winner === "away"}
        boxRef={(el) => registerBox(`${round}-${match.players.away}`, el)}
      />
      {match.status === "walkover" && (
        <div className="cup-match-walkover">ชนะบาย: {profiles[match.walkover.winnerUid]?.displayName}</div>
      )}
    </Link>
  );
}

function SideColumn({ rounds, bracketSize, profiles, championUid, sideHeight, mirror, registerBox }) {
  return (
    <div className={`cup-side ${mirror ? "cup-side-right" : "cup-side-left"}`} style={{ height: sideHeight }}>
      {rounds.map((r) => (
        <div key={r.round} className="cup-round-col">
          <h3>{roundLabel(bracketSize, r.round)}</h3>
          <div className="cup-round-slots" style={{ height: sideHeight }}>
            {r.slots.map((slot) => (
              <div key={slot.slot} className="cup-slot">
                <MatchBox slot={{ ...slot, round: r.round }} profiles={profiles} championUid={championUid} registerBox={registerBox} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// เส้นรูปข้อพับ (ออกแนวนอน -> เลี้ยวแนวตั้ง -> เข้าแนวนอน) เชื่อมจุดศูนย์กลางสองกล่อง ให้หน้าตาเหมือนเส้นสายถ้วยทั่วไป
function elbowPath(from, to) {
  const midX = (from.x + to.x) / 2;
  return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`;
}

export default function BracketView({ matches, profiles, bracketSize, leagueStatus }) {
  const layout = useMemo(() => computeBracketLayout(matches, bracketSize), [matches, bracketSize]);
  const { leftRounds, rightRounds, finalSlot, championUid, totalRounds } = layout;
  const [mobileSide, setMobileSide] = useState("both");

  const sideRound1Count = bracketSize / 4; // round 1 ของแต่ละฝั่ง (ครึ่งหนึ่งของ round 1 ทั้งหมด)
  const sideHeight = UNIT_PX * Math.max(sideRound1Count, 1);
  const champion = championUid ? profiles[championUid] : null;
  const isFinished = leagueStatus === "finished";

  // ===== แอนิเมชันวาดเส้น =====
  const [skipAnimation, setSkipAnimation] = useState(() => prefersReducedMotion() || getStoredSkipAnimation());
  const [positions, setPositions] = useState({});
  const [drawnKeys, setDrawnKeys] = useState(() => new Set());
  const [keyDelays, setKeyDelays] = useState({});
  const [celebrate, setCelebrate] = useState(false);
  const boxRefs = useRef(new Map());
  const trophyRef = useRef(null);
  const containerRef = useRef(null);
  const prevChampionRef = useRef(undefined);
  const drawnKeysRef = useRef(new Set());

  function registerBox(key, el) {
    if (el) boxRefs.current.set(key, el);
    else boxRefs.current.delete(key);
  }

  const teamPaths = useMemo(() => computeTeamPaths(matches, bracketSize, championUid), [matches, bracketSize, championUid]);

  // รายการ "ช่วงเชื่อม" ทั้งหมดพร้อม metadata (group ของรอบต้นทาง ใช้คำนวณ stagger) — คำนวณครั้งเดียวต่อ teamPaths เปลี่ยน
  const segmentList = useMemo(
    () =>
      teamPaths.flatMap((tp, ti) =>
        tp.segments.map((seg, si) => ({
          key: `${tp.uid}__${ti}_${si}__${seg.fromRound}-${seg.toRound}`,
          uid: tp.uid,
          seg,
          isChampion: tp.isChampion,
        }))
      ),
    [teamPaths]
  );
  const allSegmentKeys = useMemo(() => segmentList.map((s) => s.key), [segmentList]);
  const allSegmentKeysJoined = allSegmentKeys.join(",");

  // วัดตำแหน่งกล่องจริงหลัง render (responsive ตรง) — รีวัดตอน resize/รอบเปลี่ยน/สลับมุมมองมือถือด้วย
  useLayoutEffect(() => {
    function measure() {
      const containerEl = containerRef.current;
      if (!containerEl) return;
      const containerRect = containerEl.getBoundingClientRect();
      const next = {};
      for (const [key, el] of boxRefs.current) {
        const r = el.getBoundingClientRect();
        next[key] = { x: r.left - containerRect.left + r.width / 2, y: r.top - containerRect.top + r.height / 2 };
      }
      if (trophyRef.current) {
        const r = trophyRef.current.getBoundingClientRect();
        next.trophy = { x: r.left - containerRect.left + r.width / 2, y: r.top - containerRect.top + r.height / 2 };
      }
      setPositions(next);
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [matches, mobileSide, bracketSize]);

  // ทำเครื่องหมาย "วาดแล้ว" — ชุดแรกตอนโหลดหน้าวาดทุกช่วงพร้อม stagger ไล่ทีละรอบ, ชุดหลัง (ผลแมตช์เปลี่ยนสด ๆ ระหว่างดู) วาดทันทีไม่หน่วง
  useEffect(() => {
    const newKeys = allSegmentKeys.filter((k) => !drawnKeysRef.current.has(k));
    if (newKeys.length === 0) return;
    const isInitialBatch = drawnKeysRef.current.size === 0;

    const raf = requestAnimationFrame(() => {
      setKeyDelays((prevDelays) => {
        const nextDelays = { ...prevDelays };
        for (const key of newKeys) {
          if (skipAnimation || !isInitialBatch) {
            nextDelays[key] = 0;
          } else {
            const meta = segmentList.find((s) => s.key === key);
            nextDelays[key] = meta ? (meta.seg.group - 1) * STAGGER_MS : 0;
          }
        }
        return nextDelays;
      });
      for (const key of newKeys) drawnKeysRef.current.add(key);
      setDrawnKeys(new Set(drawnKeysRef.current));
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSegmentKeysJoined, skipAnimation]);

  // ฉลองแชมป์ — เด้ง/เรืองตอนเส้นวิ่งถึงถ้วยเสร็จ (ครั้งแรกที่รู้ว่ามีแชมป์ ไม่ว่าจะตอนโหลดหน้าหรือสด ๆ ระหว่างดู)
  useEffect(() => {
    if (championUid == null || prevChampionRef.current === championUid) {
      prevChampionRef.current = championUid;
      return;
    }
    const wasInitial = prevChampionRef.current === undefined;
    prevChampionRef.current = championUid;
    if (skipAnimation) return;
    const delay = wasInitial ? totalRounds * STAGGER_MS + DRAW_MS : DRAW_MS;
    const t = setTimeout(() => {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), CELEBRATE_MS);
    }, delay);
    return () => clearTimeout(t);
  }, [championUid, skipAnimation, totalRounds]);

  function handleToggleSkip() {
    const next = !skipAnimation;
    setSkipAnimation(next);
    setStoredSkipAnimation(next);
    if (next) {
      drawnKeysRef.current = new Set(allSegmentKeys);
      setDrawnKeys(new Set(allSegmentKeys));
    }
  }

  return (
    <div className="cup-bracket">
      {totalRounds > 1 && (
        <div className="cup-bracket-mobile-toggle">
          <button type="button" className={mobileSide === "left" ? "tab-active" : ""} onClick={() => setMobileSide("left")}>
            สายซ้าย
          </button>
          <button type="button" className={mobileSide === "both" ? "tab-active" : ""} onClick={() => setMobileSide("both")}>
            ทั้งหมด
          </button>
          <button type="button" className={mobileSide === "right" ? "tab-active" : ""} onClick={() => setMobileSide("right")}>
            สายขวา
          </button>
        </div>
      )}

      <div className="cup-bracket-scroll">
        <div className={`cup-bracket-row cup-bracket-mobile-${mobileSide}`} ref={containerRef}>
          <svg className="cup-paths-svg" aria-hidden="true">
            {segmentList.map(({ key, uid, seg, isChampion }) => {
              const fromKey = `${seg.fromRound}-${uid}`;
              const toKey = seg.toRound === "trophy" ? "trophy" : `${seg.toRound}-${uid}`;
              const from = positions[fromKey];
              const to = positions[toKey];
              if (!from || !to) return null;
              const delay = keyDelays[key] ?? 0;
              return (
                <path
                  key={key}
                  d={elbowPath(from, to)}
                  pathLength={1}
                  className={`cup-path ${isChampion ? "cup-path-champion" : ""} ${
                    drawnKeys.has(key) ? "cup-path-drawn" : ""
                  } ${skipAnimation ? "cup-path-instant" : ""}`}
                  style={{ transitionDelay: `${delay}ms`, transitionDuration: `${DRAW_MS}ms` }}
                />
              );
            })}
          </svg>

          {leftRounds.length > 0 && (
            <SideColumn
              rounds={leftRounds}
              bracketSize={bracketSize}
              profiles={profiles}
              championUid={championUid}
              sideHeight={sideHeight}
              mirror={false}
              registerBox={registerBox}
            />
          )}

          <div className="cup-center" style={{ minHeight: sideHeight }}>
            <div className="cup-center-champion">
              {champion ? (
                <div className={`cup-champion-badge ${celebrate ? "cup-celebrate" : ""}`}>
                  <Crown size={28} className="cup-champion-crown" aria-hidden="true" />
                  <TeamAvatar photoURL={champion.photoURL} name={champion.displayName} />
                </div>
              ) : (
                <div className="cup-champion-placeholder" aria-hidden="true" />
              )}
            </div>
            <div ref={trophyRef} className={celebrate ? "cup-celebrate" : ""}>
              <CupTrophy lit={isFinished} size={84} />
            </div>
            {champion && <span className="cup-champion-name">{champion.displayName}</span>}
            {finalSlot && (
              <div className="cup-round-col cup-final-col">
                <h3>{roundLabel(bracketSize, finalSlot.round)}</h3>
                <MatchBox slot={finalSlot} profiles={profiles} championUid={championUid} registerBox={registerBox} />
              </div>
            )}
          </div>

          {rightRounds.length > 0 && (
            <SideColumn
              rounds={rightRounds}
              bracketSize={bracketSize}
              profiles={profiles}
              championUid={championUid}
              sideHeight={sideHeight}
              mirror
              registerBox={registerBox}
            />
          )}
        </div>
      </div>

      <button type="button" className="cup-skip-btn" onClick={handleToggleSkip}>
        {skipAnimation ? <Play size={14} aria-hidden="true" /> : <SkipForward size={14} aria-hidden="true" />}
        {skipAnimation ? "เปิดอนิเมชัน" : "ข้ามอนิเมชัน"}
      </button>
    </div>
  );
}
