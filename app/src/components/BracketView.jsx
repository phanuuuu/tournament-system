import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function scoreLabel(side, m) {
  if (m.status === "walkover") return null;
  if (m.status !== "approved") return "-";
  const score = side === "home" ? m.approvedResult.scoreHome : m.approvedResult.scoreAway;
  const penalty = side === "home" ? m.approvedResult.penaltyHome : m.approvedResult.penaltyAway;
  return penalty != null ? `${score} (${penalty})` : `${score}`;
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

  function isOnPlayerPath(m) {
    return m.players.home === user.uid || m.players.away === user.uid;
  }

  return (
    <div className="bracket-view">
      <div className="bracket-scroll">
        {roundNumbers.map((round) => (
          <div key={round} className={`bracket-round ${round === currentRound ? "bracket-round-current" : ""}`}>
            <h3>รอบ {round}</h3>
            {rounds[round]
              .sort((a, b) => a.slot - b.slot)
              .map((m) => (
                <Link
                  key={m.id}
                  to={`/matches/${m.id}`}
                  className={`bracket-match ${isOnPlayerPath(m) ? "bracket-match-mine" : ""}`}
                >
                  <div>{profiles[m.players.home]?.displayName ?? "..."} {scoreLabel("home", m)}</div>
                  <div>{profiles[m.players.away]?.displayName ?? "..."} {scoreLabel("away", m)}</div>
                  {m.status === "walkover" && <div className="bracket-walkover">ชนะบาย: {profiles[m.walkover.winnerUid]?.displayName}</div>}
                </Link>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
