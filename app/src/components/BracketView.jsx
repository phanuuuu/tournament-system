import { useState } from "react";
import { Link } from "react-router-dom";
import { Crown } from "lucide-react";
import { computeBracketLayout, scoreLabel, winnerUidOf } from "../utils/bracketLayout";
import { roundLabel } from "../utils/roundLabel";
import CupTrophy from "./CupTrophy";

const UNIT_PX = 96; // ความสูงต่อช่องของรอบแรกฝั่งใดฝั่งหนึ่ง (รอบลึกขึ้นเว้นห่างเป็น 2x, 4x, ... อัตโนมัติด้วย justify-content: space-around)

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

function TeamRow({ profile, label, isWinner, isChampionSide, placeholder }) {
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
      <div className="cup-team-top">
        <TeamAvatar photoURL={profile?.photoURL} name={profile?.displayName} />
        <span className="cup-team-score">{label}</span>
      </div>
      <span className="cup-team-name">{profile?.displayName ?? "..."}</span>
    </div>
  );
}

function MatchBox({ slot, profiles, championUid }) {
  const { match } = slot;
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
      />
      <TeamRow
        profile={profiles[match.players.away]}
        label={scoreLabel("away", match)}
        isWinner={winner === "away"}
        isChampionSide={isChampionMatch && winner === "away"}
      />
      {match.status === "walkover" && (
        <div className="cup-match-walkover">ชนะบาย: {profiles[match.walkover.winnerUid]?.displayName}</div>
      )}
    </Link>
  );
}

// เส้นตรงเชื่อมรอบรองชนะเลิศของแต่ละฝั่งเข้าสู่รอบชิงกลางจอ (ฝั่งละ 1 คู่เท่านั้นเสมอ ไม่มีกิ่งซ้อนแบบ Connector ปกติ)
function TailConnector({ championPath }) {
  return (
    <div className={`cup-tail-connector ${championPath ? "cup-connector-champion" : ""}`} aria-hidden="true">
      <span className="cup-tail-line" />
    </div>
  );
}

// เส้นเชื่อมระหว่างรอบ — ฝั่งซ้ายเรียงรอบเข้ากลาง (ปกติ), ฝั่งขวาเรียงรอบเข้ากลางแบบกลับทาง (mirror ด้วย CSS scaleX เดียวกัน)
function Connector({ height, championPath, mirror }) {
  return (
    <div
      className={`cup-connector ${championPath ? "cup-connector-champion" : ""} ${mirror ? "cup-connector-mirror" : ""}`}
      style={{ height }}
      aria-hidden="true"
    >
      <span className="cup-connector-top" />
      <span className="cup-connector-bottom" />
      <span className="cup-connector-vert" />
      <span className="cup-connector-out" />
    </div>
  );
}

function SideColumn({ rounds, bracketSize, profiles, championUid, sideHeight, mirror }) {
  const unitFor = (slotCount) => sideHeight / slotCount;

  return (
    <div className={`cup-side ${mirror ? "cup-side-right" : "cup-side-left"}`} style={{ height: sideHeight }}>
      {rounds.map((r, colIdx) => {
        const isOutermost = mirror ? colIdx === rounds.length - 1 : colIdx === 0;
        return (
          <div key={r.round} className="cup-round-col">
            <h3>{roundLabel(bracketSize, r.round)}</h3>
            <div className="cup-round-slots" style={{ height: sideHeight }}>
              {r.slots.map((slot) => {
                const prevSlotCount = r.slots.length * 2;
                const championPath = championUid != null && slot.match && winnerUidOf(slot.match) === championUid;
                return (
                  <div key={slot.slot} className="cup-slot">
                    {!isOutermost && !mirror && <Connector height={unitFor(prevSlotCount)} championPath={championPath} />}
                    <MatchBox slot={slot} profiles={profiles} championUid={championUid} />
                    {!isOutermost && mirror && (
                      <Connector height={unitFor(prevSlotCount)} championPath={championPath} mirror />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function BracketView({ matches, profiles, bracketSize, leagueStatus }) {
  const layout = computeBracketLayout(matches, bracketSize);
  const { leftRounds, rightRounds, finalSlot, championUid, totalRounds } = layout;
  const [mobileSide, setMobileSide] = useState("both");

  const sideRound1Count = bracketSize / 4; // round 1 ของแต่ละฝั่ง (ครึ่งหนึ่งของ round 1 ทั้งหมด)
  const sideHeight = UNIT_PX * Math.max(sideRound1Count, 1);
  const champion = championUid ? profiles[championUid] : null;
  const isFinished = leagueStatus === "finished";

  const leftSemi = leftRounds[leftRounds.length - 1]?.slots[0];
  const rightSemi = rightRounds[0]?.slots[0];
  const leftTailChampion = championUid != null && leftSemi?.match && winnerUidOf(leftSemi.match) === championUid;
  const rightTailChampion = championUid != null && rightSemi?.match && winnerUidOf(rightSemi.match) === championUid;

  return (
    <div className="cup-bracket">
      {totalRounds > 1 && (
        <div className="cup-bracket-mobile-toggle">
          <button
            type="button"
            className={mobileSide === "left" ? "tab-active" : ""}
            onClick={() => setMobileSide("left")}
          >
            สายซ้าย
          </button>
          <button
            type="button"
            className={mobileSide === "both" ? "tab-active" : ""}
            onClick={() => setMobileSide("both")}
          >
            ทั้งหมด
          </button>
          <button
            type="button"
            className={mobileSide === "right" ? "tab-active" : ""}
            onClick={() => setMobileSide("right")}
          >
            สายขวา
          </button>
        </div>
      )}

      <div className="cup-bracket-scroll">
        <div className={`cup-bracket-row cup-bracket-mobile-${mobileSide}`}>
          {leftRounds.length > 0 && (
            <SideColumn
              rounds={leftRounds}
              bracketSize={bracketSize}
              profiles={profiles}
              championUid={championUid}
              sideHeight={sideHeight}
              mirror={false}
            />
          )}
          {leftRounds.length > 0 && finalSlot && <TailConnector championPath={leftTailChampion} />}

          <div className="cup-center" style={{ minHeight: sideHeight }}>
            <div className="cup-center-champion">
              {champion ? (
                <div className="cup-champion-badge">
                  <Crown size={28} className="cup-champion-crown" aria-hidden="true" />
                  <TeamAvatar photoURL={champion.photoURL} name={champion.displayName} />
                </div>
              ) : (
                <div className="cup-champion-placeholder" aria-hidden="true" />
              )}
            </div>
            <CupTrophy lit={isFinished} size={84} />
            {champion && <span className="cup-champion-name">{champion.displayName}</span>}
            {finalSlot && (
              <div className="cup-round-col cup-final-col">
                <h3>{roundLabel(bracketSize, finalSlot.round)}</h3>
                <MatchBox slot={finalSlot} profiles={profiles} championUid={championUid} />
              </div>
            )}
          </div>
          {rightRounds.length > 0 && finalSlot && <TailConnector championPath={rightTailChampion} />}

          {rightRounds.length > 0 && (
            <SideColumn
              rounds={rightRounds}
              bracketSize={bracketSize}
              profiles={profiles}
              championUid={championUid}
              sideHeight={sideHeight}
              mirror
            />
          )}
        </div>
      </div>
    </div>
  );
}
