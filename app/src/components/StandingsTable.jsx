import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { computeForm } from "../utils/standings";

function Avatar({ photoURL, name, className = "standings-avatar" }) {
  return photoURL ? (
    <img src={photoURL} alt="" className={className} />
  ) : (
    <span className={`${className} standings-avatar-fallback`}>{name?.[0] ?? "?"}</span>
  );
}

function zoneClass(row, total) {
  if (row.rank === 1) return "standings-zone-top";
  if (row.rank === total) return "standings-zone-bottom";
  return "";
}

function FormDots({ outcomes }) {
  if (!outcomes || outcomes.length === 0) return <span className="standings-form-empty">ยังไม่แข่ง</span>;
  return (
    <span className="standings-form-dots">
      {outcomes.map((o, i) => (
        <span key={i} className={`standings-form-dot standings-form-${o.toLowerCase()}`}>
          {o}
        </span>
      ))}
    </span>
  );
}

function Podium({ top, profiles }) {
  if (top.length === 0) return null;
  // ลำดับการวางบนแท่น: 2(ซ้าย) - 1(กลาง,สูงสุด) - 3(ขวา) — ถ้ามีไม่ครบ 3 คนก็วางเท่าที่มี
  const slots = top.length >= 3 ? [top[1], top[0], top[2]] : top.length === 2 ? [top[1], top[0]] : [top[0]];
  return (
    <div className="standings-podium">
      {slots.map((row) => {
        const profile = profiles[row.uid];
        return (
          <div key={row.uid} className={`standings-podium-slot standings-podium-rank${row.rank}`}>
            {row.rank === 1 && (
              <span className="standings-podium-crown" aria-hidden="true">
                👑
              </span>
            )}
            <Avatar photoURL={profile?.photoURL} name={profile?.displayName} className="standings-podium-avatar" />
            <span className="standings-podium-name">{profile?.displayName ?? "..."}</span>
            <span className="standings-podium-pts">{row.points} แต้ม</span>
            <span className="standings-podium-base">{row.rank}</span>
          </div>
        );
      })}
    </div>
  );
}

function LastPlaceBox({ row, profiles }) {
  const profile = profiles[row.uid];
  return (
    <div className="standings-lastplace">
      <Avatar photoURL={profile?.photoURL} name={profile?.displayName} className="standings-lastplace-avatar" />
      <div>
        <p className="standings-lastplace-label">บ๊วย 🐢</p>
        <p className="standings-lastplace-name">{profile?.displayName ?? "..."}</p>
        <p className="standings-lastplace-cheer">รั้งท้ายอยู่ สู้ๆนะ!</p>
      </div>
    </div>
  );
}

export default function StandingsTable({ standings, matches, byeBans, profiles, isAdmin, onCreateTiebreaker }) {
  const { user } = useAuth();
  const [tab, setTab] = useState("table");
  const rowRefs = useRef({});
  const prevRectsRef = useRef({});
  const prevRanksRef = useRef({});
  const [recentChanges, setRecentChanges] = useState({});

  const form = useMemo(
    () => computeForm(standings.map((r) => r.uid), matches ?? [], byeBans ?? {}),
    [standings, matches, byeBans]
  );

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
    const raf = requestAnimationFrame(() => setRecentChanges((old) => ({ ...old, ...changes })));
    const timer = setTimeout(() => {
      setRecentChanges((old) => {
        const next = { ...old };
        for (const uid of Object.keys(changes)) delete next[uid];
        return next;
      });
    }, 3000);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [standings]);

  const top3 = standings.slice(0, 3);
  const showLastPlace = standings.length > 3;
  const lastRow = showLastPlace ? standings[standings.length - 1] : null;

  return (
    <div className="standings-table">
      <Podium top={top3} profiles={profiles} />

      <div className="standings-tabs">
        <button type="button" className={tab === "table" ? "tab-active" : ""} onClick={() => setTab("table")}>
          ตาราง
        </button>
        <button type="button" className={tab === "form" ? "tab-active" : ""} onClick={() => setTab("form")}>
          ฟอร์ม
        </button>
      </div>

      <details className="standings-info">
        <summary>วิธีจัดอันดับ</summary>
        <p>เรียงตาม แต้ม → ผลต่างประตู (+/-) → ประตูได้ ถ้ายังเท่ากันเป๊ะทุกตัวต้องแข่งตัดสิน</p>
      </details>

      <div className="standings-scroll">
        <table>
          <thead>
            {tab === "table" ? (
              <tr>
                <th className="standings-col-rank">อันดับ</th>
                <th className="standings-col-team">ทีม</th>
                <th>แข่ง</th>
                <th>ชนะ</th>
                <th>เสมอ</th>
                <th>แพ้</th>
                <th>ได้</th>
                <th>เสีย</th>
                <th>+/-</th>
                <th>แต้ม</th>
              </tr>
            ) : (
              <tr>
                <th className="standings-col-rank">อันดับ</th>
                <th className="standings-col-team">ทีม</th>
                <th colSpan={2}>ฟอร์ม 5 นัดหลังสุด</th>
              </tr>
            )}
          </thead>
          <tbody>
            {standings.map((row, i) => {
              const arrow = recentChanges[row.uid];
              const profile = profiles[row.uid];
              return (
                <tr
                  key={row.uid}
                  ref={(el) => (rowRefs.current[row.uid] = el)}
                  className={`standings-row-enter ${row.uid === user.uid ? "my-row" : ""} ${zoneClass(row, standings.length)}`}
                  style={{ animationDelay: `${Math.min(i, 12) * 70}ms` }}
                >
                  <td className="standings-col-rank">
                    <span className="rank-cell">
                      {row.rank}
                      {arrow && (
                        <span className={`rank-arrow rank-arrow-${arrow}`}>
                          {arrow === "up" ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="standings-col-team">
                    <span className="standings-team-cell">
                      <Avatar photoURL={profile?.photoURL} name={profile?.displayName} />
                      <span className="standings-team-name">{profile?.displayName ?? "..."}</span>
                    </span>
                  </td>
                  {tab === "table" ? (
                    <>
                      <td>{row.played}</td>
                      <td>{row.won}</td>
                      <td>{row.drawn}</td>
                      <td>{row.lost}</td>
                      <td>{row.gf}</td>
                      <td>{row.ga}</td>
                      <td>{row.gd}</td>
                      <td className="standings-col-points">{row.points}</td>
                    </>
                  ) : (
                    <td colSpan={2}>
                      <FormDots outcomes={form[row.uid]} />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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

      {showLastPlace && <LastPlaceBox row={lastRow} profiles={profiles} />}
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
