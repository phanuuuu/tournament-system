import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Crown, Maximize2, LocateFixed, Plus, Minus } from "lucide-react";
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import { computeBracketLayout, isSettled, nodeState, scoreLabel, winnerUidOf } from "../utils/bracketLayout";
import { computeBracketGeometry, NODE_RADIUS } from "../utils/bracketGeometry";
import { roundLabel } from "../utils/roundLabel";
import { prefersReducedMotion } from "../utils/animationPrefs";
import { useAuth } from "../context/AuthContext";
import CupTrophy from "./CupTrophy";

const PHASE_A_MS = 3000; // ทุกคนในรอบวิ่งจากรูป -> จุดบรรจบ พร้อมกัน
const PHASE_B_MS = 500; // ผู้ชนะเลี้ยวออกจากจุดบรรจบ -> รูปรอบถัดไป
const CELEBRATE_MS = 900;
const MOBILE_BREAKPOINT = 720;
const HEADER_HEIGHT = 28;

function TeamAvatar({ photoURL, name }) {
  return photoURL ? (
    <img src={photoURL} alt="" className="cup-node-avatar" />
  ) : (
    <span className="cup-node-avatar cup-node-avatar-fallback" aria-hidden="true">
      {name?.[0] ?? "?"}
    </span>
  );
}

function PlayerNode({ pos, uid, profile, label, matchId, state, isMe, nodeRef }) {
  const placeholder = !uid;
  return (
    <div className="cup-node-wrap" style={{ left: pos.x, top: pos.y + HEADER_HEIGHT }}>
      {!placeholder && (
        <Link to={`/matches/${matchId}`} className="cup-node-hitarea" aria-label={profile?.displayName ?? "ผู้เล่น"} />
      )}
      <div
        className={`cup-node ${state ? `cup-node-${state}` : ""} ${isMe ? "cup-node-me" : ""} ${
          placeholder ? "cup-node-placeholder" : ""
        }`}
        ref={nodeRef}
      >
        {placeholder ? (
          <span className="cup-node-avatar cup-node-avatar-fallback" aria-hidden="true">
            ?
          </span>
        ) : (
          <TeamAvatar photoURL={profile?.photoURL} name={profile?.displayName} />
        )}
        {label != null && <span className="cup-node-score">{label}</span>}
      </div>
      <span className={`cup-node-name ${placeholder ? "cup-node-name-placeholder" : ""}`}>
        {placeholder ? "รอทีม" : profile?.displayName ?? "..."}
      </span>
    </div>
  );
}

// เส้นหักมุมฉาก: ออกแนวนอนจาก "from" ไปถึงระดับ x ของ "to" ก่อน แล้วค่อยหักขึ้น/ลงแนวตั้งเข้า "to" เป๊ะ
function elbow(from, to) {
  return `M ${from.x} ${from.y} L ${to.x} ${from.y} L ${to.x} ${to.y}`;
}

function edgeOf(pos, goesRight) {
  return { x: pos.x + (goesRight ? NODE_RADIUS : -NODE_RADIUS), y: pos.y };
}

// แมตช์หนึ่งคู่ -> ช่วงเส้นที่เกี่ยวข้อง (ผู้แพ้จบที่จุดบรรจบ, ผู้ชนะเลี้ยวออกไปรอบถัดไปถ้ามี)
// ทิศที่จะออกจากขอบรูปคำนวณจากตำแหน่งจริงเทียบกับจุดบรรจบ (ไม่ต้องรู้ฝั่งซ้าย/ขวาล่วงหน้า)
function buildMatchSegments(round, slot, match, championUid, geometry, totalRounds, isFinal) {
  if (!match || !isSettled(match.status)) return [];
  const homeUid = match.players.home;
  const homePos = geometry.positions[`${round}-${slot}-home`];
  const awayPos = geometry.positions[`${round}-${slot}-away`];
  if (!homePos || !awayPos) return [];

  const winnerUid = winnerUidOf(match);
  if (winnerUid == null) return [];
  const winnerPos = winnerUid === homeUid ? homePos : awayPos;
  const loserPos = winnerUid === homeUid ? awayPos : homePos;
  const isChampionPath = winnerUid === championUid;

  let junction;
  let nextPos = null;
  if (isFinal) {
    junction = { x: (homePos.x + awayPos.x) / 2, y: (homePos.y + awayPos.y) / 2 };
  } else {
    nextPos = geometry.positions[`${round + 1}-${Math.floor(slot / 2)}-${slot % 2 === 0 ? "home" : "away"}`];
    const targetX = nextPos ? nextPos.x : homePos.x;
    junction = { x: (homePos.x + targetX) / 2, y: (homePos.y + awayPos.y) / 2 };
  }

  const winnerGoesRight = junction.x > winnerPos.x;
  const loserGoesRight = junction.x > loserPos.x;

  const segments = [
    {
      key: `${match.id}-loser`,
      d: elbow(edgeOf(loserPos, loserGoesRight), junction),
      colorState: "dim",
      round,
      phase: "A",
    },
    {
      key: `${match.id}-winner-a`,
      d: elbow(edgeOf(winnerPos, winnerGoesRight), junction),
      colorState: isChampionPath ? "champion" : "alive",
      round,
      phase: "A",
    },
  ];

  if (!isFinal && nextPos) {
    segments.push({
      key: `${match.id}-winner-b`,
      d: elbow(junction, nextPos),
      colorState: isChampionPath ? "champion" : "alive",
      round,
      phase: "B",
    });
  }

  return segments;
}

function ZoomToolbar({ canvasRef, leftHalfRef, rightHalfRef, myNodeRef, hasMe, totalRounds }) {
  const { zoomIn, zoomOut, zoomToElement } = useControls();

  return (
    <div className="cup-zoom-toolbar">
      {totalRounds > 1 && (
        <div className="cup-bracket-mobile-toggle">
          <button type="button" onClick={() => leftHalfRef.current && zoomToElement(leftHalfRef.current)}>
            สายซ้าย
          </button>
          <button type="button" onClick={() => canvasRef.current && zoomToElement(canvasRef.current)}>
            ทั้งหมด
          </button>
          <button type="button" onClick={() => rightHalfRef.current && zoomToElement(rightHalfRef.current)}>
            สายขวา
          </button>
        </div>
      )}
      <div className="cup-zoom-buttons">
        <button type="button" className="cup-zoom-btn" onClick={() => zoomOut()} aria-label="ซูมออก">
          <Minus size={16} />
        </button>
        <button type="button" className="cup-zoom-btn" onClick={() => zoomIn()} aria-label="ซูมเข้า">
          <Plus size={16} />
        </button>
        <button
          type="button"
          className="cup-zoom-btn"
          onClick={() => canvasRef.current && zoomToElement(canvasRef.current)}
          aria-label="ดูทั้งสาย"
        >
          <Maximize2 size={16} />
        </button>
        {hasMe && (
          <button
            type="button"
            className="cup-zoom-btn"
            onClick={() => myNodeRef.current && zoomToElement(myNodeRef.current, 1.6, 500)}
            aria-label="โฟกัสที่ฉัน"
          >
            <LocateFixed size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function InitialFit({ canvasRef, leftHalfRef }) {
  const { zoomToElement } = useControls();
  useEffect(() => {
    const target = window.innerWidth < MOBILE_BREAKPOINT ? leftHalfRef.current : canvasRef.current;
    if (target) zoomToElement(target, undefined, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default function BracketView({ matches, profiles, bracketSize, leagueStatus }) {
  const { user } = useAuth();
  const layout = useMemo(() => computeBracketLayout(matches, bracketSize), [matches, bracketSize]);
  const { roundsSkeleton, finalSlot, championUid, totalRounds } = layout;
  const geometry = useMemo(() => computeBracketGeometry(layout), [layout]);

  const champion = championUid ? profiles[championUid] : null;
  const isFinished = leagueStatus === "finished";

  const [skipAnimation] = useState(() => prefersReducedMotion());
  const [drawnKeys, setDrawnKeys] = useState(() => new Set());
  const [keyDelays, setKeyDelays] = useState({});
  const [celebrate, setCelebrate] = useState(false);
  const prevChampionRef = useRef(undefined);
  const drawnKeysRef = useRef(new Set());
  const canvasRef = useRef(null);
  const leftHalfRef = useRef(null);
  const rightHalfRef = useRef(null);
  const myNodeRef = useRef(null);

  const segmentList = useMemo(() => {
    const list = [];
    for (const r of roundsSkeleton) {
      const isFinal = r.round === totalRounds;
      for (const slot of r.slots) {
        list.push(...buildMatchSegments(r.round, slot.slot, slot.match, championUid, geometry, totalRounds, isFinal));
      }
    }
    return list;
  }, [roundsSkeleton, championUid, geometry, totalRounds]);

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

  // ฉลองแชมป์ — เด้ง/เรืองตอนเส้นวิ่งถึงรอบชิงจบ
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

  const hasMe = roundsSkeleton.some((r) =>
    r.slots.some((s) => s.match && (s.match.players.home === user.uid || s.match.players.away === user.uid))
  );

  // หัวข้อรอบ (รอบ X ทีม) วางไว้บนสุดของแต่ละคอลัมน์ — เอาตำแหน่ง x จากโหนด home ของรอบนั้น (ทุก slot ในรอบเดียวกัน x เท่ากันอยู่แล้ว)
  const columnHeaders = roundsSkeleton
    .filter((r) => r.round !== totalRounds)
    .map((r) => ({
      round: r.round,
      x: geometry.positions[`${r.round}-${r.slots[0].slot}-home`].x,
    }));

  // มือถือ/แท็บเล็ต (รองรับสัมผัส): ปิดลากนิ้วเดียว pan เนื้อผัง ให้เลื่อนหน้าทั้งหน้าแนวตั้งได้ปกติ —
  // ซูมสองนิ้ว (pinch) เป็นโค้ดคนละเส้นทางในไลบรารี ไม่ถูกปิดไปด้วย ส่วนเมาส์/แทร็กแพดเดสก์ท็อปยังลาก pan ได้ตามปกติ
  const isTouchDevice = typeof window !== "undefined" && (("ontouchstart" in window) || navigator.maxTouchPoints > 0);

  return (
    <div className="cup-bracket">
      <TransformWrapper
        initialScale={1}
        minScale={0.2}
        maxScale={2.5}
        limitToBounds={false}
        centerZoomedOut={false}
        doubleClick={{ disabled: true }}
        panning={{ disabled: isTouchDevice, velocityDisabled: true }}
        wheel={{ step: 0.15 }}
      >
        <ZoomToolbar
          canvasRef={canvasRef}
          leftHalfRef={leftHalfRef}
          rightHalfRef={rightHalfRef}
          myNodeRef={myNodeRef}
          hasMe={hasMe}
          totalRounds={totalRounds}
        />
        <InitialFit canvasRef={canvasRef} leftHalfRef={leftHalfRef} />
        <TransformComponent wrapperClass="cup-zoom-wrapper" contentClass="cup-zoom-content">
          <div
            className="cup-canvas"
            ref={canvasRef}
            style={{ width: geometry.totalWidth, height: geometry.totalHeight + HEADER_HEIGHT }}
          >
            <div
              className="cup-half-marker"
              ref={leftHalfRef}
              style={{ left: 0, top: 0, width: geometry.trophyPos.x, height: geometry.totalHeight + HEADER_HEIGHT }}
              aria-hidden="true"
            />
            <div
              className="cup-half-marker"
              ref={rightHalfRef}
              style={{
                left: geometry.trophyPos.x,
                top: 0,
                width: geometry.totalWidth - geometry.trophyPos.x,
                height: geometry.totalHeight + HEADER_HEIGHT,
              }}
              aria-hidden="true"
            />

            {columnHeaders.map(({ round, x }) => (
              <span key={round} className="cup-round-label" style={{ left: x }}>
                {roundLabel(bracketSize, round)}
              </span>
            ))}
            <span className="cup-round-label" style={{ left: geometry.trophyPos.x }}>
              {finalSlot ? roundLabel(bracketSize, finalSlot.round) : ""}
            </span>

            <svg className="cup-paths-svg" aria-hidden="true">
              {segmentList.map(({ key, d, colorState, phase }) => (
                <path
                  key={key}
                  d={d}
                  pathLength={1}
                  transform={`translate(0, ${HEADER_HEIGHT})`}
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

            {roundsSkeleton.map((r) => {
              if (r.round === totalRounds) return null; // รอบชิง render แยกด้านล่าง
              return r.slots.map((slot) => {
                const homePos = geometry.positions[`${r.round}-${slot.slot}-home`];
                const awayPos = geometry.positions[`${r.round}-${slot.slot}-away`];
                const match = slot.match;
                return (
                  <div key={`${r.round}-${slot.slot}`} style={{ display: "contents" }}>
                    <PlayerNode
                      pos={homePos}
                      uid={match?.players.home}
                      profile={match ? profiles[match.players.home] : null}
                      label={match ? scoreLabel("home", match) : null}
                      matchId={match?.id}
                      state={match ? nodeState(match.players.home, match, championUid) : null}
                      isMe={!!match && match.players.home === user.uid}
                      nodeRef={match && match.players.home === user.uid ? myNodeRef : undefined}
                    />
                    <PlayerNode
                      pos={awayPos}
                      uid={match?.players.away}
                      profile={match ? profiles[match.players.away] : null}
                      label={match ? scoreLabel("away", match) : null}
                      matchId={match?.id}
                      state={match ? nodeState(match.players.away, match, championUid) : null}
                      isMe={!!match && match.players.away === user.uid}
                      nodeRef={match && match.players.away === user.uid ? myNodeRef : undefined}
                    />
                  </div>
                );
              });
            })}

            {finalSlot && (
              <>
                <PlayerNode
                  pos={geometry.positions[`${finalSlot.round}-0-home`]}
                  uid={finalSlot.match?.players.home}
                  profile={finalSlot.match ? profiles[finalSlot.match.players.home] : null}
                  label={finalSlot.match ? scoreLabel("home", finalSlot.match) : null}
                  matchId={finalSlot.match?.id}
                  state={finalSlot.match ? nodeState(finalSlot.match.players.home, finalSlot.match, championUid) : null}
                  isMe={!!finalSlot.match && finalSlot.match.players.home === user.uid}
                  nodeRef={finalSlot.match && finalSlot.match.players.home === user.uid ? myNodeRef : undefined}
                />
                <PlayerNode
                  pos={geometry.positions[`${finalSlot.round}-0-away`]}
                  uid={finalSlot.match?.players.away}
                  profile={finalSlot.match ? profiles[finalSlot.match.players.away] : null}
                  label={finalSlot.match ? scoreLabel("away", finalSlot.match) : null}
                  matchId={finalSlot.match?.id}
                  state={finalSlot.match ? nodeState(finalSlot.match.players.away, finalSlot.match, championUid) : null}
                  isMe={!!finalSlot.match && finalSlot.match.players.away === user.uid}
                  nodeRef={finalSlot.match && finalSlot.match.players.away === user.uid ? myNodeRef : undefined}
                />
              </>
            )}

            <div className="cup-center" style={{ left: geometry.trophyPos.x, top: geometry.trophyPos.y + HEADER_HEIGHT }}>
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
              <div className={celebrate ? "cup-celebrate" : ""}>
                <CupTrophy lit={isFinished} size={84} />
              </div>
              {champion && <span className="cup-champion-name">{champion.displayName}</span>}
            </div>
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
