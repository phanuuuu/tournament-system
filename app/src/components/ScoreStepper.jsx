import { useEffect, useRef, useState } from "react";

const HOLD_INITIAL_DELAY_MS = 450; // กดค้างกี่ ms ก่อนเริ่มรัว
const HOLD_REPEAT_MS = 90; // ความถี่ตอนรัวซ้ำ
const BOUNCE_MS = 220;

export default function ScoreStepper({ label, value, onChange, disabled, required }) {
  const num = value === "" ? null : Number(value);
  const [bouncing, setBouncing] = useState(false);
  const bounceTimerRef = useRef(null);
  const holdTimerRef = useRef(null);
  const holdIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      clearTimeout(bounceTimerRef.current);
      clearTimeout(holdTimerRef.current);
      clearInterval(holdIntervalRef.current);
    };
  }, []);

  // ปิดแล้วเปิดใหม่เฟรมถัดไป กันเคสกดรัวเร็วจนแอนิเมชันไม่ retrigger (className เดิมไม่เปลี่ยนค่าเฉย ๆ ไม่ทำให้ CSS เล่นใหม่)
  function playBounce() {
    setBouncing(false);
    requestAnimationFrame(() => setBouncing(true));
    clearTimeout(bounceTimerRef.current);
    bounceTimerRef.current = setTimeout(() => setBouncing(false), BOUNCE_MS);
  }

  function step(delta) {
    const next = Math.max(0, (num ?? 0) + delta);
    onChange(String(next));
    playBounce();
    if (navigator.vibrate) navigator.vibrate(15);
  }

  function clearHold() {
    clearTimeout(holdTimerRef.current);
    clearInterval(holdIntervalRef.current);
  }

  // กดค้างเพื่อเพิ่ม/ลดรัว ๆ — กดครั้งแรก step ทันทีหนึ่งที, ถ้ายังกดอยู่เกิน HOLD_INITIAL_DELAY_MS ค่อยเริ่มรัวซ้ำ
  function startHold(delta) {
    step(delta);
    holdTimerRef.current = setTimeout(() => {
      holdIntervalRef.current = setInterval(() => step(delta), HOLD_REPEAT_MS);
    }, HOLD_INITIAL_DELAY_MS);
  }

  return (
    <label className="score-stepper">
      <span className="score-stepper-label">{label}</span>
      <div className="score-stepper-control">
        <button
          type="button"
          className="btn-ghost score-stepper-btn"
          onPointerDown={(e) => {
            e.preventDefault();
            if (!(disabled || !num)) startHold(-1);
          }}
          onPointerUp={clearHold}
          onPointerLeave={clearHold}
          disabled={disabled || !num}
          aria-label={`ลด ${label}`}
        >
          −
        </button>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          className={`score-stepper-input ${bouncing ? "score-stepper-bounce" : ""}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
        />
        <button
          type="button"
          className="btn-ghost score-stepper-btn"
          onPointerDown={(e) => {
            e.preventDefault();
            if (!disabled) startHold(1);
          }}
          onPointerUp={clearHold}
          onPointerLeave={clearHold}
          disabled={disabled}
          aria-label={`เพิ่ม ${label}`}
        >
          +
        </button>
      </div>
    </label>
  );
}
