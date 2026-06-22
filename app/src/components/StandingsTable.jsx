import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function StandingsTable({ standings, profiles, isAdmin, onCreateTiebreaker }) {
  const { user } = useAuth();
  const rowRefs = useRef({});
  const prevRectsRef = useRef({});
  const prevRanksRef = useRef({});
  const [recentChanges, setRecentChanges] = useState({});

  // FLIP: จับตำแหน่งแถวก่อน/หลัง recompute แล้วเล่นแอนิเมชันเลื่อนกลับมาที่ 0 ด้วย transform ล้วน
  useLayoutEffect(() => {
    const prevRects = prevRectsRef.current;
    const nextRects = {};
    for (const row of standings) {
      const el = rowRefs.current[row.uid];
      if (!el) continue;
      const newRect = el.getBoundingClientRect();
      const oldRect = prevRects[row.uid];
      if (oldRect) {
        const deltaY = oldRect.top - newRect.top;
        if (Math.abs(deltaY) > 1) {
          el.style.transition = "none";
          el.style.transform = `translateY(${deltaY}px)`;
          requestAnimationFrame(() => {
            el.style.transition = "transform 400ms ease";
            el.style.transform = "";
          });
        }
      }
      nextRects[row.uid] = newRect;
    }
    prevRectsRef.current = nextRects;
  }, [standings]);

  // ลูกศรขึ้น/ลง — โชว์แค่ช่วงสั้น ๆ หลังอันดับเปลี่ยนจริง ไม่ค้างถาวร (กันดูเก่า/เข้าใจผิดว่าเพิ่งเปลี่ยน)
  useEffect(() => {
    const prevRanks = prevRanksRef.current;
    const changes = {};
    for (const row of standings) {
      const p = prevRanks[row.uid];
      if (p != null && p !== row.rank) changes[row.uid] = p > row.rank ? "up" : "down";
    }
    const nextRanks = {};
    for (const row of standings) nextRanks[row.uid] = row.rank;
    prevRanksRef.current = nextRanks;

    if (Object.keys(changes).length === 0) return;
    setRecentChanges((old) => ({ ...old, ...changes }));
    const timer = setTimeout(() => {
      setRecentChanges((old) => {
        const next = { ...old };
        for (const uid of Object.keys(changes)) delete next[uid];
        return next;
      });
    }, 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standings]);

  return (
    <div className="standings-table">
      <details className="standings-info">
        <summary>วิธีจัดอันดับ</summary>
        <p>เรียงตาม แต้ม → ผลต่างประตู (+/-) → ประตูได้ ถ้ายังเท่ากันเป๊ะทุกตัวต้องแข่งตัดสิน</p>
      </details>

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
          {standings.map((row) => {
            const arrow = recentChanges[row.uid];
            return (
              <tr
                key={row.uid}
                ref={(el) => (rowRefs.current[row.uid] = el)}
                className={row.uid === user.uid ? "my-row" : ""}
              >
                <td>
                  <span className="rank-cell">
                    {row.rank}
                    {arrow && (
                      <span className={`rank-arrow rank-arrow-${arrow}`}>
                        {arrow === "up" ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                      </span>
                    )}
                  </span>
                </td>
                <td>{profiles[row.uid]?.displayName ?? "..."}</td>
                <td>{row.played}</td>
                <td>{row.gf}</td>
                <td>{row.ga}</td>
                <td>{row.gd}</td>
                <td>{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {standings.some((r) => r.stillTied) && (
        <div className="tie-explainer">
          <p>มีผู้เล่นที่แต้ม / ผลต่างประตู / ประตูได้ เท่ากันเป๊ะทุกตัวตัดสิน ต้องให้แอดมินจัดแมตช์ตัดสิน:</p>
          {pairsNeedingTiebreaker(standings).map(([a, b]) => (
            <p key={a.uid + b.uid}>
              {profiles[a.uid]?.displayName} vs {profiles[b.uid]?.displayName}
              {isAdmin && (
                <button type="button" className="btn-ghost btn-sm" onClick={() => onCreateTiebreaker(a.uid, b.uid)}>
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
