import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";

export default function MatchListRaw({ matches, profiles }) {
  function nameOf(uid) {
    return profiles?.[uid]?.displayName ?? uid;
  }

  return (
    <div className="match-list-raw">
      <h2>ตารางแข่ง ({matches.length} แมตช์)</h2>
      <ul>
        {matches.map((m) => (
          <li key={m.id}>
            <Link to={`/matches/${m.id}`}>
              <span>
                <code>{m.matchCode}</code> — {nameOf(m.players.home)} vs {nameOf(m.players.away)}
                {m.round != null && <> (รอบ {m.round})</>}
                {m.leg != null && <> (นัดที่ {m.leg})</>}
              </span>
              <StatusBadge status={m.status} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
