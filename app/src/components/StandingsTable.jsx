import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { computeForm } from "../utils/standings";

// สปลาชหน้าแอป (BootSplashGate) ครอบ children ไว้เฉย ๆ (ไม่ unmount) อย่างน้อย ~2.4 วิ — ถ้าปล่อยให้อนิเมชันนับเวลาจาก mount เลย
// ตอนรีเฟรชหน้าจริง โพเดียมจะขึ้นจบไปแล้วทั้งที่ยังโดนสปลาชบังอยู่ ผู้ใช้จะไม่เห็นจังหวะขึ้นทีละอันเลย
// hook นี้รอให้ .splash-screen หายไปจาก DOM ก่อน (หรือเริ่มทันทีถ้าไม่มีสปลาชอยู่แล้ว เช่นกดลิงก์ในแอปไปหน้านี้)
function useAnimationsReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!document.querySelector(".splash-screen")) {
      const raf = requestAnimationFrame(() => setReady(true));
      return () => cancelAnimationFrame(raf);
    }
    const observer = new MutationObserver(() => {
      if (!document.querySelector(".splash-screen")) {
        setReady(true);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return ready;
}

function Avatar({ photoURL, name, className = "standings-avatar" }) {
  return photoURL ? (
    <img src={photoURL} alt="" className={className} />
  ) : (
    <span className={`${className} standings-avatar-fallback`}>
      {name?.[0] ?? "?"}
    </span>
  );
}

function zoneClass(row, total) {
  if (row.rank === 1) return "standings-zone-top";
  if (row.rank === total) return "standings-zone-bottom";
  return "";
}

function FormDots({ outcomes }) {
  if (!outcomes || outcomes.length === 0)
    return <span className="standings-form-empty">ยังไม่แข่ง</span>;
  return (
    <span className="standings-form-dots">
      {outcomes.map((o, i) => (
        <span
          key={i}
          className={`standings-form-dot standings-form-${o.toLowerCase()}`}
        >
          {o}
        </span>
      ))}
    </span>
  );
}

const PODIUM_STAGGER_MS = 650; // โพเดียมโผล่ทีละอัน ช้า ๆ ให้เห็นชัด
const PODIUM_RISE_MS = 750;
const ROW_STAGGER_MS = 320; // ตารางค่อยทยอยโผล่ทีละแถวหลังโพเดียมจบ รวมกันให้ได้ฟีล ~5 วิทั้งหมด
const ROW_FADE_MS = 650;
const MAX_STAGGER_ROWS = 12; // กันลีคใหญ่มาก ๆ ใช้เวลานานเกินไป (จากแถวที่ 12 ขึ้นไปหน่วงเท่ากันหมด)

function Podium({ top, profiles, animReady }) {
  if (top.length === 0) return null;
  // ลำดับการวางบนแท่น: 2(ซ้าย) - 1(กลาง,สูงสุด) - 3(ขวา) — ถ้ามีไม่ครบ 3 คนก็วางเท่าที่มี
  // ลำดับการ "โผล่ทีละอัน": ซ้าย -> กลาง -> ขวา ตามที่วางจริงบนจอ
  const slots =
    top.length >= 3
      ? [top[1], top[0], top[2]]
      : top.length === 2
        ? [top[1], top[0]]
        : [top[0]];
  return (
    <div className="standings-podium">
      {slots.map((row, i) => {
        const profile = profiles[row.uid];
        return (
          <div
            key={row.uid}
            className={`standings-podium-slot standings-podium-rank${row.rank} ${animReady ? "standings-anim-go" : "standings-anim-wait"}`}
            style={{
              animationDelay: `${i * PODIUM_STAGGER_MS}ms`,
              animationDuration: `${PODIUM_RISE_MS}ms`,
            }}
          >
            {row.rank === 1 && (
              <span className="standings-podium-crown" aria-hidden="true">
                👑
              </span>
            )}
            <Avatar
              photoURL={profile?.photoURL}
              name={profile?.displayName}
              className="standings-podium-avatar"
            />
            <span className="standings-podium-name">
              {profile?.displayName ?? "..."}
            </span>
            <span className="standings-podium-pts">{row.points} แต้ม</span>
            <span className="standings-podium-base">{row.rank}</span>
          </div>
        );
      })}
    </div>
  );
}

const LAST_PLACE_CHEERS = [
  "รั้งท้ายอยู่ แต่ใจไม่แตก! 💪",
  "บ๊วยปีนี้ รุ่งปีหน้าแน่นอน 🌟",
  "อย่างน้อยก็ไม่ได้แข่งคนเดียว 😂",
];

function LastPlaceBox({ row, profiles }) {
  const profile = profiles[row.uid];
  const cheer = LAST_PLACE_CHEERS[row.uid.length % LAST_PLACE_CHEERS.length];
  return (
    <div className="standings-lastplace">
      <p className="standings-lastplace-label">
        บ๊วย <span aria-hidden="true">💀</span>
      </p>
      <div className="standings-lastplace-avatar-wrap">
        <Avatar
          photoURL={profile?.photoURL}
          name={profile?.displayName}
          className="standings-lastplace-avatar"
        />
        <span className="standings-lastplace-badge" aria-hidden="true">
          😭
        </span>
      </div>
      <p className="standings-lastplace-name">
        {profile?.displayName ?? "..."}
      </p>
      <p className="standings-lastplace-cheer">{cheer}</p>
    </div>
  );
}

export default function StandingsTable({
  standings,
  matches,
  byeBans,
  profiles,
  isAdmin,
  onCreateTiebreaker,
}) {
  const { user } = useAuth();
  const animReady = useAnimationsReady();
  const [tab, setTab] = useState("table");
  const rowRefs = useRef({});
  const prevRectsRef = useRef({});
  const prevRanksRef = useRef({});
  const [recentChanges, setRecentChanges] = useState({});

  const form = useMemo(
    () =>
      computeForm(
        standings.map((r) => r.uid),
        matches ?? [],
        byeBans ?? {},
      ),
    [standings, matches, byeBans],
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
      if (p != null && p !== row.rank)
        changes[row.uid] = p > row.rank ? "up" : "down";
    }
    const nextRanks = {};
    for (const row of standings) nextRanks[row.uid] = row.rank;
    prevRanksRef.current = nextRanks;

    if (Object.keys(changes).length === 0) return;
    const raf = requestAnimationFrame(() =>
      setRecentChanges((old) => ({ ...old, ...changes })),
    );
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

  // ตารางเริ่มโผล่ทีละแถวหลังโพเดียมขึ้นจนเกือบครบ ไม่ใช่พร้อมกัน — ให้ทั้งฉากดูเป็นลำดับเดียวต่อกัน ไม่ใช่สองอนิเมชันแยกกัน
  const podiumTotalMs =
    Math.max(0, top3.length - 1) * PODIUM_STAGGER_MS + PODIUM_RISE_MS;
  const tableStartDelay = top3.length > 0 ? podiumTotalMs - 250 : 0;

  return (
    <>
      <div className="standings-table">
        <Podium top={top3} profiles={profiles} animReady={animReady} />

        <div className="standings-tabs">
          <button
            type="button"
            className={tab === "table" ? "tab-active" : ""}
            onClick={() => setTab("table")}
          >
            ตาราง
          </button>
          <button
            type="button"
            className={tab === "form" ? "tab-active" : ""}
            onClick={() => setTab("form")}
          >
            ฟอร์ม
          </button>
        </div>

        <details className="standings-info">
          <summary>วิธีจัดอันดับ</summary>
          <p>
            เรียงตาม แต้ม → ผลต่างประตู (+/-) → ประตูได้
            ถ้ายังเท่ากันเป๊ะทุกตัวต้องแข่งตัดสิน
          </p>
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
                    className={`standings-row-enter ${animReady ? "standings-anim-go" : "standings-anim-wait"} ${row.uid === user.uid ? "my-row" : ""} ${zoneClass(row, standings.length)}`}
                    style={{
                      animationDelay: `${tableStartDelay + Math.min(i, MAX_STAGGER_ROWS) * ROW_STAGGER_MS}ms`,
                      animationDuration: `${ROW_FADE_MS}ms`,
                    }}
                  >
                    <td className="standings-col-rank">
                      <span className="rank-cell">
                        {row.rank}
                        {arrow && (
                          <span className={`rank-arrow rank-arrow-${arrow}`}>
                            {arrow === "up" ? (
                              <ArrowUp size={11} />
                            ) : (
                              <ArrowDown size={11} />
                            )}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="standings-col-team">
                      <span className="standings-team-cell">
                        <Avatar
                          photoURL={profile?.photoURL}
                          name={profile?.displayName}
                        />
                        <span className="standings-team-name">
                          {profile?.displayName ?? "..."}
                        </span>
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
            <p>
              มีผู้เล่นที่แต้ม / ผลต่างประตู / ประตูได้ เท่ากันเป๊ะทุกตัวตัดสิน
              ต้องให้แอดมินจัดแมตช์ตัดสิน:
            </p>
            {pairsNeedingTiebreaker(standings).map(([a, b]) => (
              <p key={a.uid + b.uid}>
                {profiles[a.uid]?.displayName} vs {profiles[b.uid]?.displayName}
                {isAdmin && (
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => onCreateTiebreaker(a.uid, b.uid)}
                  >
                    สร้างแมตช์ตัดสิน
                  </button>
                )}
              </p>
            ))}
          </div>
        )}
      </div>

      {showLastPlace && <LastPlaceBox row={lastRow} profiles={profiles} />}
    </>
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
