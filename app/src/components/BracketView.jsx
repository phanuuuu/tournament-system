import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const UNIT_PX = 92; // ความสูงต่อช่องของรอบแรก — รอบหลัง ๆ จะเว้นห่างเป็น 2x, 4x, ... ของค่านี้โดยอัตโนมัติ

function scoreLabel(side, m) {
  if (m.status === "walkover") return null;
  if (m.status !== "approved") return "-";
  const score = side === "home" ? m.approvedResult.scoreHome : m.approvedResult.scoreAway;
  const penalty = side === "home" ? m.approvedResult.penaltyHome : m.approvedResult.penaltyAway;
  return penalty != null ? `${score} (${penalty})` : `${score}`;
}

function winnerSide(m) {
  if (m.status === "walkover") return m.walkover.winnerUid === m.players.home ? "home" : "away";
  if (m.status !== "approved") return null;
  const { scoreHome, scoreAway, penaltyHome, penaltyAway } = m.approvedResult;
  if (scoreHome !== scoreAway) return scoreHome > scoreAway ? "home" : "away";
  if (penaltyHome != null) return penaltyHome > penaltyAway ? "home" : "away";
  return null;
}

export default function BracketView({ matches, profiles, currentRound }) {
  const { user } = useAuth();

  const rounds = {};
  for (const m of matches) {
    if (m.kind !== "regular" || m.round == null) continue;
    rounds[m.round] = rounds[m.round] ?? [];
    rounds[m.round].push(m);
  }
  const roundNumbers = Object.keys(rounds)
    .map(Number)
    .sort((a, b) => a - b);
  for (const round of roundNumbers) rounds[round].sort((a, b) => a.slot - b.slot);

  const firstRound = roundNumbers[0];
  const totalHeight = UNIT_PX * (rounds[firstRound]?.length ?? 1);
  const unitFor = (round) => totalHeight / (rounds[round]?.length ?? 1);

  function isOnPlayerPath(m) {
    return m.players.home === user.uid || m.players.away === user.uid;
  }

  return (
    <div className="bracket-view">
      <div className="bracket-scroll">
        {roundNumbers.map((round) => (
          <div key={round} className={`bracket-round ${round === currentRound ? "bracket-round-current" : ""}`}>
            <h3>รอบ {round}</h3>
            <div className="bracket-slots" style={{ height: totalHeight }}>
              {rounds[round].map((m) => {
                const isFirstRound = round === firstRound;
                const winner = winnerSide(m);
                const mine = isOnPlayerPath(m);
                return (
                  <div key={m.id} className="bracket-slot">
                    {!isFirstRound && (
                      <div
                        className={`bracket-connector ${mine ? "bracket-connector-mine" : ""}`}
                        style={{ height: unitFor(round - 1) }}
                        aria-hidden="true"
                      >
                        <span className="bracket-connector-top" />
                        <span className="bracket-connector-bottom" />
                        <span className="bracket-connector-vert" />
                        <span className="bracket-connector-out" />
                      </div>
                    )}
                    <Link to={`/matches/${m.id}`} className={`bracket-match ${mine ? "bracket-match-mine" : ""}`}>
                      <div className={winner === "home" ? "bracket-side-winner" : ""}>
                        {profiles[m.players.home]?.displayName ?? "..."} {scoreLabel("home", m)}
                      </div>
                      <div className={winner === "away" ? "bracket-side-winner" : ""}>
                        {profiles[m.players.away]?.displayName ?? "..."} {scoreLabel("away", m)}
                      </div>
                      {m.status === "walkover" && (
                        <div className="bracket-walkover">ชนะบาย: {profiles[m.walkover.winnerUid]?.displayName}</div>
                      )}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
