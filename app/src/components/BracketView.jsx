import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LocateFixed } from "lucide-react";
import { computeBracketLayout, isSettled, nodeState, scoreLabel, winnerUidOf } from "../utils/bracketLayout";
import { computeBracketGeometry, NODE_RADIUS } from "../utils/bracketGeometry";
import { roundLabel } from "../utils/roundLabel";
import { prefersReducedMotion } from "../utils/animationPrefs";
import { useAuth } from "../context/AuthContext";
import CupTrophy from "./CupTrophy";

const PHASE_A_MS = 3000; // ทุกคนในรอบวิ่งจากรูป -> จุดบรรจบ พร้อมกัน
const PHASE_B_MS = 500; // ผู้ชนะเลี้ยวออกจากจุดบรรจบ -> รูปรอบถัดไป
const CELEBRATE_MS = 900;
const HEADER_HEIGHT = 64; // เผื่อที่ให้ label หัวรอบไม่ทับขอบบนของรูปโปรไฟล์แถวแรก (เดิม 44 ยังไม่พอ)
const BOTTOM_PADDING = 36; // เผื่อพื้นที่ด้านล่างผัง ไม่ให้รอบสุดท้าย/ชื่อผู้เล่นอยู่ติดขอบจนอึดอัด

function TeamAvatar({ photoURL, name }) {
  return photoURL ? (
    <img src={photoURL} alt="" className="cup-node-avatar" />
  ) : (
    <span className="cup-node-avatar cup-node-avatar-fallback" aria-hidden="true">
      {name?.[0] ?? "?"}
    </span>
  );
}

function PlayerNode({ pos, uid, profile, label, matchId, state, isMe, isMyCurrent }) {
  const placeholder = !uid;
  return (
    <div
      className="cup-node-wrap"
      data-my-current={isMyCurrent || undefined}
      style={{ left: pos.x, top: pos.y + HEADER_HEIGHT }}
    >
      {!placeholder && (
        <Link to={`/matches/${matchId}`} className="cup-node-hitarea" aria-label={profile?.displayName ?? "ผู้เล่น"} />
      )}
      <div
        className={`cup-node ${state ? `cup-node-${state}` : ""} ${isMe ? "cup-node-me" : ""} ${
          placeholder ? "cup-node-placeholder" : ""
        }`}
      >
        {state === "champion" && (
          <span className="cup-node-crown" aria-hidden="true">
            👑
          </span>
        )}
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
// นัดชิง (isFinal) ไม่ต้องมีเส้นเลย — ผู้เล่นทั้งสองจบแค่ที่รูปของตัวเอง ไม่ลากเข้าไปหาถ้วยกลางจอ (สถานะแชมป์ไปเด่นที่ตัวโหนดเองแทน)
// ยังไม่ตัดสิน (match เป็น null หรือยังไม่จบ) ก็วาดได้ — ตำแหน่งมาจากโครงผังล้วน ๆ ไม่ต้องรู้ผล วาดเป็นเส้นทึบ "โครงร่าง" ล่วงหน้าไปจนถึงนัดชิงเสมอ
// พอแมตช์นั้นตัดสินผลจริง ค่อยเปลี่ยนเป็นเรืองแสงตามผู้ชนะ (คีย์ของสองสถานะนี้ตั้งใจให้ต่างกัน ทำให้ React คนละ element กัน ไม่ต้องคอย morph เส้นเดิม)
function buildMatchSegments(round, slot, match, championUid, geometry, isFinal) {
  if (isFinal) return [];
  const homePos = geometry.positions[`${round}-${slot}-home`];
  const awayPos = geometry.positions[`${round}-${slot}-away`];
  if (!homePos || !awayPos) return [];

  const nextPos = geometry.positions[`${round + 1}-${Math.floor(slot / 2)}-${slot % 2 === 0 ? "home" : "away"}`];
  const targetX = nextPos ? nextPos.x : homePos.x;
  const junction = { x: (homePos.x + targetX) / 2, y: (homePos.y + awayPos.y) / 2 };

  const settled = match && isSettled(match.status);
  const winnerUid = settled ? winnerUidOf(match) : null;

  if (!settled || winnerUid == null) {
    const homeGoesRight = junction.x > homePos.x;
    const awayGoesRight = junction.x > awayPos.x;
    const segments = [
      { key: `${round}-${slot}-skel-home`, d: elbow(edgeOf(homePos, homeGoesRight), junction), colorState: "dim", round, phase: "A" },
      { key: `${round}-${slot}-skel-away`, d: elbow(edgeOf(awayPos, awayGoesRight), junction), colorState: "dim", round, phase: "A" },
    ];
    if (nextPos) {
      segments.push({ key: `${round}-${slot}-skel-next`, d: elbow(junction, nextPos), colorState: "dim", round, phase: "B" });
    }
    return segments;
  }

  const homeUid = match.players.home;
  const winnerPos = winnerUid === homeUid ? homePos : awayPos;
  const loserPos = winnerUid === homeUid ? awayPos : homePos;
  const isChampionPath = winnerUid === championUid;

  const winnerGoesRight = junction.x > winnerPos.x;
  const loserGoesRight = junction.x > loserPos.x;

  const segments = [
    {
      key: `${round}-${slot}-loser`,
      d: elbow(edgeOf(loserPos, loserGoesRight), junction),
      colorState: "dim",
      round,
      phase: "A",
    },
    {
      key: `${round}-${slot}-winner-a`,
      d: elbow(edgeOf(winnerPos, winnerGoesRight), junction),
      colorState: isChampionPath ? "champion" : "alive",
      round,
      phase: "A",
    },
  ];

  if (nextPos) {
    segments.push({
      key: `${round}-${slot}-winner-b`,
      d: elbow(junction, nextPos),
      colorState: isChampionPath ? "champion" : "alive",
      round,
      phase: "B",
    });
  }

  return segments;
}

export default function BracketView({ matches, profiles, bracketSize, leagueStatus }) {
  const { user } = useAuth();
  const layout = useMemo(() => computeBracketLayout(matches, bracketSize), [matches, bracketSize]);
  const { roundsSkeleton, finalSlot, championUid, totalRounds } = layout;
  const geometry = useMemo(() => computeBracketGeometry(layout), [layout]);

  const isFinished = leagueStatus === "finished";

  const [skipAnimation] = useState(() => prefersReducedMotion());
  const [drawnKeys, setDrawnKeys] = useState(() => new Set());
  const [keyDelays, setKeyDelays] = useState({});
  const [celebrate, setCelebrate] = useState(false);
  const [mobileSide, setMobileSide] = useState("both");
  const prevChampionRef = useRef(undefined);
  const drawnKeysRef = useRef(new Set());
  const scrollRef = useRef(null);

  // จุดที่ฉันอยู่ปัจจุบัน = แมตช์รอบลึกสุดที่มี uid ฉันอยู่ (ชนะมาเรื่อย ๆ แมตช์รอบถัดไปจะมี uid ฉันโผล่ขึ้นมาเองอยู่แล้ว ไม่ต้องไล่ผู้ชนะเอง)
  const myCurrentMatch = useMemo(() => {
    let best = null;
    for (const m of matches) {
      if (m.kind !== "regular" || m.round == null) continue;
      if (m.players.home !== user.uid && m.players.away !== user.uid) continue;
      if (!best || m.round > best.round) best = m;
    }
    return best;
  }, [matches, user.uid]);
  const myCurrentRole = myCurrentMatch ? (myCurrentMatch.players.home === user.uid ? "home" : "away") : null;

  function scrollToMe() {
    scrollRef.current?.querySelector('[data-my-current="true"]')?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  }

  function isMyCurrentNode(round, slot, role) {
    return !!myCurrentMatch && myCurrentMatch.round === round && myCurrentMatch.slot === slot && myCurrentRole === role;
  }

  const segmentList = useMemo(() => {
    const list = [];
    for (const r of roundsSkeleton) {
      const isFinal = r.round === totalRounds;
      for (const slot of r.slots) {
        list.push(...buildMatchSegments(r.round, slot.slot, slot.match, championUid, geometry, isFinal));
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

  // หัวข้อรอบ (รอบ X ทีม) วางไว้บนสุดของแต่ละคอลัมน์ — แต่ละรอบมีคอลัมน์ทั้งฝั่งซ้ายและขวา (x ต่างกัน) ต้องใส่ label สองจุดต่อรอบ
  // slots[0] = slot แรกของรอบ (อยู่ฝั่งซ้ายเสมอตามกติกาแบ่งครึ่งของ computeBracketLayout), slots สุดท้าย = ฝั่งขวาเสมอ
  const columnHeaders = roundsSkeleton
    .filter((r) => r.round !== totalRounds)
    .flatMap((r) => {
      const leftX = geometry.positions[`${r.round}-${r.slots[0].slot}-home`].x;
      const rightX = geometry.positions[`${r.round}-${r.slots[r.slots.length - 1].slot}-home`].x;
      if (leftX === rightX) return [{ key: `${r.round}`, round: r.round, x: leftX }];
      return [
        { key: `${r.round}-l`, round: r.round, x: leftX },
        { key: `${r.round}-r`, round: r.round, x: rightX },
      ];
    });

  // เลื่อนสกอลล์แนวนอนไปยังฝั่งที่เลือก — ผ้าใบเต็มขนาดจริง ไม่ได้บีบ/ซ่อนใคร แค่เลื่อนพามาดูฝั่งที่อยากดู
  function scrollToSide(side) {
    setMobileSide(side);
    const el = scrollRef.current;
    if (!el) return;
    const viewportWidth = el.clientWidth;
    const targetScroll =
      side === "left" ? 0 : side === "right" ? geometry.totalWidth - viewportWidth : geometry.trophyPos.x - viewportWidth / 2;
    el.scrollTo({ left: Math.max(0, targetScroll), behavior: "smooth" });
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, geometry.trophyPos.x - el.clientWidth / 2);
  }, [geometry.trophyPos.x]);

  return (
    <div className="cup-bracket">
      {(totalRounds > 1 || myCurrentMatch) && (
        <div className="cup-bracket-toolbar">
          {totalRounds > 1 && (
            <div className="cup-bracket-mobile-toggle">
              <button type="button" className={mobileSide === "left" ? "tab-active" : ""} onClick={() => scrollToSide("left")}>
                สายซ้าย
              </button>
              <button type="button" className={mobileSide === "both" ? "tab-active" : ""} onClick={() => scrollToSide("both")}>
                ทั้งหมด
              </button>
              <button type="button" className={mobileSide === "right" ? "tab-active" : ""} onClick={() => scrollToSide("right")}>
                สายขวา
              </button>
            </div>
          )}
          {myCurrentMatch && (
            <button type="button" className="cup-find-me-btn" onClick={scrollToMe}>
              <LocateFixed size={14} /> หาตัวเอง
            </button>
          )}
        </div>
      )}
      <div className="cup-bracket-scroll" ref={scrollRef}>
        <div
          className="cup-canvas"
          style={{ width: geometry.totalWidth, height: geometry.totalHeight + HEADER_HEIGHT + BOTTOM_PADDING }}
        >
          {columnHeaders.map(({ key, round, x }) => (
            <span key={key} className="cup-round-label" style={{ left: x }}>
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
                    isMyCurrent={isMyCurrentNode(r.round, slot.slot, "home")}
                  />
                  <PlayerNode
                    pos={awayPos}
                    uid={match?.players.away}
                    profile={match ? profiles[match.players.away] : null}
                    label={match ? scoreLabel("away", match) : null}
                    matchId={match?.id}
                    state={match ? nodeState(match.players.away, match, championUid) : null}
                    isMe={!!match && match.players.away === user.uid}
                    isMyCurrent={isMyCurrentNode(r.round, slot.slot, "away")}
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
                isMyCurrent={isMyCurrentNode(finalSlot.round, 0, "home")}
              />
              <PlayerNode
                pos={geometry.positions[`${finalSlot.round}-0-away`]}
                uid={finalSlot.match?.players.away}
                profile={finalSlot.match ? profiles[finalSlot.match.players.away] : null}
                label={finalSlot.match ? scoreLabel("away", finalSlot.match) : null}
                matchId={finalSlot.match?.id}
                state={finalSlot.match ? nodeState(finalSlot.match.players.away, finalSlot.match, championUid) : null}
                isMe={!!finalSlot.match && finalSlot.match.players.away === user.uid}
                isMyCurrent={isMyCurrentNode(finalSlot.round, 0, "away")}
              />
            </>
          )}

          <div className="cup-center" style={{ left: geometry.trophyPos.x, top: geometry.trophyPos.y + HEADER_HEIGHT }}>
            <div className={celebrate ? "cup-celebrate" : ""}>
              <CupTrophy lit={isFinished} size={84} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
