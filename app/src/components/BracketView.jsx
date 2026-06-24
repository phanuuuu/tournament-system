import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Crown } from "lucide-react";
import { computeBracketLayout, isSettled, nodeState, scoreLabel, winnerUidOf } from "../utils/bracketLayout";
import { roundLabel } from "../utils/roundLabel";
import { prefersReducedMotion } from "../utils/animationPrefs";
import CupTrophy from "./CupTrophy";

const NODE_RADIUS = 20;
const FALLBACK_SPACING = 160; // ใช้ตอนยังวัดระยะห่างคอลัมน์จริงไม่ได้ (เช่น เพิ่งโหลด ยังไม่มีคู่ไหนผ่านรอบเลย)
const PHASE_A_MS = 3000; // ทุกคนในรอบวิ่งจากรูป -> จุดบรรจบ พร้อมกัน
const PHASE_B_MS = 500; // ผู้ชนะเลี้ยวออกจากจุดบรรจบ -> รูปรอบถัดไป
const CELEBRATE_MS = 900;

function TeamAvatar({ photoURL, name }) {
  return photoURL ? (
    <img src={photoURL} alt="" className="cup-node-avatar" />
  ) : (
    <span className="cup-node-avatar cup-node-avatar-fallback" aria-hidden="true">
      {name?.[0] ?? "?"}
    </span>
  );
}

function PlayerNode({ round, uid, profile, label, matchId, state, registerNode }) {
  if (!uid) {
    return (
      <div className="cup-node-wrap">
        <div className="cup-node cup-node-placeholder">
          <span className="cup-node-avatar cup-node-avatar-fallback" aria-hidden="true">
            ?
          </span>
        </div>
        <span className="cup-node-name">รอทีม</span>
      </div>
    );
  }
  return (
    <div className="cup-node-wrap">
      <Link to={`/matches/${matchId}`} className="cup-node-hitarea" aria-label={profile?.displayName ?? "ผู้เล่น"} />
      <div className={`cup-node ${state ? `cup-node-${state}` : ""}`} ref={(el) => registerNode(`${round}-${uid}`, el)}>
        <TeamAvatar photoURL={profile?.photoURL} name={profile?.displayName} />
        {label != null && <span className="cup-node-score">{label}</span>}
      </div>
      <span className="cup-node-name">{profile?.displayName ?? "..."}</span>
    </div>
  );
}

function MatchPair({ round, slot, profiles, championUid, registerNode }) {
  const { match } = slot;
  if (!match) {
    return (
      <div className="cup-match-pair">
        <PlayerNode registerNode={registerNode} />
        <PlayerNode registerNode={registerNode} />
      </div>
    );
  }
  return (
    <div className="cup-match-pair">
      <PlayerNode
        round={round}
        uid={match.players.home}
        profile={profiles[match.players.home]}
        label={scoreLabel("home", match)}
        matchId={match.id}
        state={nodeState(match.players.home, match, championUid)}
        registerNode={registerNode}
      />
      <PlayerNode
        round={round}
        uid={match.players.away}
        profile={profiles[match.players.away]}
        label={scoreLabel("away", match)}
        matchId={match.id}
        state={nodeState(match.players.away, match, championUid)}
        registerNode={registerNode}
      />
    </div>
  );
}

function SideColumn({ side, rounds, bracketSize, profiles, championUid, sideHeight, registerNode }) {
  return (
    <div className={`cup-side cup-side-${side}`} style={{ height: sideHeight }}>
      {rounds.map((r) => (
        <div key={r.round} className="cup-round-col">
          <h3>{roundLabel(bracketSize, r.round)}</h3>
          <div className="cup-round-slots" style={{ height: sideHeight }}>
            {r.slots.map((slot) => (
              <div key={slot.slot} className="cup-slot">
                <MatchPair round={r.round} slot={slot} profiles={profiles} championUid={championUid} registerNode={registerNode} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// เส้นหักมุมฉาก: ออกแนวนอนจาก "from" ไปถึงระดับ x ของ "to" ก่อน แล้วค่อยหักขึ้น/ลงแนวตั้งเข้า "to" เป๊ะ
function elbow(from, to) {
  return `M ${from.x} ${from.y} L ${to.x} ${from.y} L ${to.x} ${to.y}`;
}

// แมตช์ฝั่งซ้าย/ขวา ออกจากขอบรูปเข้าหากึ่งกลาง (ซ้ายออกขวา, ขวาออกซ้าย) ส่วนรอบชิงสองคนออกเข้าหากันตรงกลาง
function buildMatchSegments(round, slot, side, championUid, positions, spacing, isFinal) {
  const { match } = slot;
  if (!match || !isSettled(match.status)) return [];
  const homeUid = match.players.home;
  const awayUid = match.players.away;
  const homePos = positions[`${round}-${homeUid}`];
  const awayPos = positions[`${round}-${awayUid}`];
  if (!homePos || !awayPos) return [];

  const winnerUid = winnerUidOf(match);
  if (winnerUid == null) return [];
  const loserUid = winnerUid === homeUid ? awayUid : homeUid;
  const winnerPos = winnerUid === homeUid ? homePos : awayPos;
  const loserPos = winnerUid === homeUid ? awayPos : homePos;
  const isChampionPath = winnerUid === championUid;

  let junction;
  if (isFinal) {
    junction = { x: (homePos.x + awayPos.x) / 2, y: (homePos.y + awayPos.y) / 2 };
  } else if (side === "left") {
    junction = { x: homePos.x + spacing / 2, y: (homePos.y + awayPos.y) / 2 };
  } else {
    junction = { x: homePos.x - spacing / 2, y: (homePos.y + awayPos.y) / 2 };
  }

  // ขอบรูปที่จะออกเส้น — ฝั่งซ้าย/ผู้เข้าชิงฝั่งซ้ายออกขวา, ฝั่งขวา/ผู้เข้าชิงฝั่งขวาออกซ้าย (เข้าหากึ่งกลางเสมอ)
  const edgeOf = (pos, uid) => {
    const goesRight = isFinal ? uid === homeUid : side === "left";
    return { x: pos.x + (goesRight ? NODE_RADIUS : -NODE_RADIUS), y: pos.y };
  };

  const segments = [
    {
      key: `${match.id}-loser`,
      d: elbow(edgeOf(loserPos, loserUid), junction),
      colorState: "dim",
      round,
      phase: "A",
    },
    {
      key: `${match.id}-winner-a`,
      d: elbow(edgeOf(winnerPos, winnerUid), junction),
      colorState: isChampionPath ? "champion" : "alive",
      round,
      phase: "A",
    },
  ];

  if (!isFinal) {
    const nextPos = positions[`${round + 1}-${winnerUid}`];
    if (nextPos) {
      segments.push({
        key: `${match.id}-winner-b`,
        d: elbow(junction, nextPos),
        colorState: isChampionPath ? "champion" : "alive",
        round,
        phase: "B",
      });
    }
  }

  return segments;
}

export default function BracketView({ matches, profiles, bracketSize, leagueStatus }) {
  const layout = useMemo(() => computeBracketLayout(matches, bracketSize), [matches, bracketSize]);
  const { leftRounds, rightRounds, finalSlot, championUid, totalRounds } = layout;
  const [mobileSide, setMobileSide] = useState("both");

  const sideRound1Count = bracketSize / 4;
  const sideHeight = 100 * Math.max(sideRound1Count, 1);
  const champion = championUid ? profiles[championUid] : null;
  const isFinished = leagueStatus === "finished";

  const [skipAnimation] = useState(() => prefersReducedMotion());
  const [positions, setPositions] = useState({});
  const [drawnKeys, setDrawnKeys] = useState(() => new Set());
  const [keyDelays, setKeyDelays] = useState({});
  const [celebrate, setCelebrate] = useState(false);
  const nodeRefs = useRef(new Map());
  const trophyRef = useRef(null);
  const containerRef = useRef(null);
  const prevChampionRef = useRef(undefined);
  const drawnKeysRef = useRef(new Set());

  function registerNode(key, el) {
    if (!key) return;
    if (el) nodeRefs.current.set(key, el);
    else nodeRefs.current.delete(key);
  }

  // วัดตำแหน่งโหนดจริงหลัง render (responsive ตรง) — รีวัดตอน resize/รอบเปลี่ยน/สลับมุมมองมือถือด้วย
  useLayoutEffect(() => {
    function measure() {
      const containerEl = containerRef.current;
      if (!containerEl) return;
      const containerRect = containerEl.getBoundingClientRect();
      const next = {};
      for (const [key, el] of nodeRefs.current) {
        const r = el.getBoundingClientRect();
        next[key] = { x: r.left - containerRect.left + r.width / 2, y: r.top - containerRect.top + r.height / 2 };
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

  // ระยะห่างคอลัมน์จริง (วัดจากคู่โหนดที่ผ่านรอบมาแล้วจริง ๆ) ใช้คำนวณตำแหน่งจุดบรรจบของคู่ที่ยังไม่มีรอบถัดไป
  function findMeasuredSpacing() {
    for (const r of leftRounds) {
      for (const slot of r.slots) {
        const uid = slot.match?.players.home;
        if (!uid) continue;
        const a = positions[`${r.round}-${uid}`];
        const b = positions[`${r.round + 1}-${uid}`];
        if (a && b) return Math.abs(b.x - a.x);
      }
    }
    return FALLBACK_SPACING;
  }
  const spacing = findMeasuredSpacing();

  const segmentList = useMemo(() => {
    const list = [];
    for (const r of leftRounds) {
      for (const slot of r.slots) list.push(...buildMatchSegments(r.round, slot, "left", championUid, positions, spacing, false));
    }
    for (const r of rightRounds) {
      for (const slot of r.slots) list.push(...buildMatchSegments(r.round, slot, "right", championUid, positions, spacing, false));
    }
    if (finalSlot) list.push(...buildMatchSegments(finalSlot.round, finalSlot, "final", championUid, positions, spacing, true));
    return list;
  }, [leftRounds, rightRounds, finalSlot, championUid, positions, spacing]);

  const allSegmentKeys = useMemo(() => segmentList.map((s) => s.key), [segmentList]);
  const allSegmentKeysJoined = allSegmentKeys.join(",");

  // ทำเครื่องหมาย "วาดแล้ว" — ชุดแรกตอนโหลดหน้า: stagger ตามจังหวะ A/B ของแต่ละรอบ, ชุดหลัง (ผลแมตช์เปลี่ยนสด ๆ) วาดทันที
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
            continue;
          }
          const meta = segmentList.find((s) => s.key === key);
          if (!meta) {
            nextDelays[key] = 0;
            continue;
          }
          const roundDelay = (meta.round - 1) * (PHASE_A_MS + PHASE_B_MS);
          nextDelays[key] = meta.phase === "A" ? roundDelay : roundDelay + PHASE_A_MS;
        }
        return nextDelays;
      });
      for (const key of newKeys) drawnKeysRef.current.add(key);
      setDrawnKeys(new Set(drawnKeysRef.current));
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSegmentKeysJoined, skipAnimation]);

  // ฉลองแชมป์ — เด้ง/เรืองตอนเส้นวิ่งถึงรอบชิงจบ (ครั้งแรกที่รู้ว่ามีแชมป์ ไม่ว่าจะตอนโหลดหน้าหรือสด ๆ ระหว่างดู)
  useEffect(() => {
    if (championUid == null || prevChampionRef.current === championUid) {
      prevChampionRef.current = championUid;
      return;
    }
    const wasInitial = prevChampionRef.current === undefined;
    prevChampionRef.current = championUid;
    if (skipAnimation) return;
    const delay = wasInitial ? (totalRounds - 1) * (PHASE_A_MS + PHASE_B_MS) + PHASE_A_MS : PHASE_A_MS;
    const t = setTimeout(() => {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), CELEBRATE_MS);
    }, delay);
    return () => clearTimeout(t);
  }, [championUid, skipAnimation, totalRounds]);

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
            {segmentList.map(({ key, d, colorState, phase }) => (
              <path
                key={key}
                d={d}
                pathLength={1}
                className={`cup-path cup-path-${colorState} ${drawnKeys.has(key) ? "cup-path-drawn" : ""} ${
                  skipAnimation ? "cup-path-instant" : ""
                }`}
                style={{
                  transitionDelay: `${keyDelays[key] ?? 0}ms`,
                  transitionDuration: `${phase === "A" ? PHASE_A_MS : PHASE_B_MS}ms`,
                }}
              />
            ))}
          </svg>

          {leftRounds.length > 0 && (
            <SideColumn
              side="left"
              rounds={leftRounds}
              bracketSize={bracketSize}
              profiles={profiles}
              championUid={championUid}
              sideHeight={sideHeight}
              registerNode={registerNode}
            />
          )}

          {finalSlot && (
            <div className="cup-round-col cup-final-node-col cup-final-node-col-left">
              <h3>{roundLabel(bracketSize, finalSlot.round)}</h3>
              <div className="cup-final-node-slot" style={{ height: sideHeight }}>
                <PlayerNode
                  round={finalSlot.round}
                  uid={finalSlot.match?.players.home}
                  profile={finalSlot.match ? profiles[finalSlot.match.players.home] : undefined}
                  label={finalSlot.match ? scoreLabel("home", finalSlot.match) : undefined}
                  matchId={finalSlot.match?.id}
                  state={finalSlot.match ? nodeState(finalSlot.match.players.home, finalSlot.match, championUid) : null}
                  registerNode={registerNode}
                />
              </div>
            </div>
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
          </div>

          {finalSlot && (
            <div className="cup-round-col cup-final-node-col cup-final-node-col-right">
              <h3>&nbsp;</h3>
              <div className="cup-final-node-slot" style={{ height: sideHeight }}>
                <PlayerNode
                  round={finalSlot.round}
                  uid={finalSlot.match?.players.away}
                  profile={finalSlot.match ? profiles[finalSlot.match.players.away] : undefined}
                  label={finalSlot.match ? scoreLabel("away", finalSlot.match) : undefined}
                  matchId={finalSlot.match?.id}
                  state={finalSlot.match ? nodeState(finalSlot.match.players.away, finalSlot.match, championUid) : null}
                  registerNode={registerNode}
                />
              </div>
            </div>
          )}

          {rightRounds.length > 0 && (
            <SideColumn
              side="right"
              rounds={rightRounds}
              bracketSize={bracketSize}
              profiles={profiles}
              championUid={championUid}
              sideHeight={sideHeight}
              registerNode={registerNode}
            />
          )}
        </div>
      </div>
    </div>
  );
}
