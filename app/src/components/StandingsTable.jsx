import { useAuth } from "../context/AuthContext";

export default function StandingsTable({ standings, profiles, isAdmin, onCreateTiebreaker }) {
  const { user } = useAuth();

  return (
    <div className="standings-table">
      <table>
        <thead>
          <tr>
            <th>อันดับ</th>
            <th>ทีม</th>
            <th>แข่ง</th>
            <th>ได้</th>
            <th>เสีย</th>
            <th>+/-</th>
            <th>แต้ม</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row) => (
            <tr key={row.uid} className={row.uid === user.uid ? "my-row" : ""}>
              <td>{row.rank}</td>
              <td>{profiles[row.uid]?.displayName ?? "..."}</td>
              <td>{row.played}</td>
              <td>{row.gf}</td>
              <td>{row.ga}</td>
              <td>{row.gd}</td>
              <td>{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {standings.some((r) => r.stillTied) && (
        <div className="tie-explainer">
          <p>มีผู้เล่นที่แต้ม / ผลต่างประตู / ประตูได้ เท่ากันเป๊ะทุกตัวตัดสิน ต้องให้แอดมินจัดแมตช์ตัดสิน:</p>
          {pairsNeedingTiebreaker(standings).map(([a, b]) => (
            <p key={a.uid + b.uid}>
              {profiles[a.uid]?.displayName} vs {profiles[b.uid]?.displayName}
              {isAdmin && (
                <button type="button" onClick={() => onCreateTiebreaker(a.uid, b.uid)}>
                  สร้างแมตช์ตัดสิน
                </button>
              )}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function pairsNeedingTiebreaker(standings) {
  const pairs = [];
  const tiedRows = standings.filter((r) => r.stillTied);
  const groups = {};
  for (const row of tiedRows) {
    const key = `${row.points}|${row.gd}|${row.gf}`;
    groups[key] = groups[key] ?? [];
    groups[key].push(row);
  }
  for (const group of Object.values(groups)) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        pairs.push([group[i], group[j]]);
      }
    }
  }
  return pairs;
}
