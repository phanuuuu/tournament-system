const BALL_PATH = "M105 8 Q70 4 60 50";

// splash ตอนเปิดแอป (รอ Firebase Auth resolve ครั้งแรก) — คนละตัวกับ Skeleton ที่ใช้ตอนดึงข้อมูลในหน้าต่าง ๆ
export default function SplashScreen({ phase, onRetry }) {
  const isFading = phase === "fade";
  const isError = phase === "error";
  const isSlow = phase === "slow";

  return (
    <div className={`splash-screen ${isFading ? "splash-fade-out" : ""}`} role="status" aria-live="polite">
      <div className="splash-content">
        <svg className="splash-icon" viewBox="0 0 120 90" aria-hidden="true">
          <path className="splash-trail-path" d={BALL_PATH} fill="none" />
          <circle className="splash-ball" r="4" style={{ offsetPath: `path('${BALL_PATH}')` }} />

          <path
            className="splash-gamepad-body"
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
            d="M30 48 L78 48 Q92 48 95 58 L99 70 Q101 78 93 78 Q87 78 83 72 L77 64 Q73 60 65 60 L43 60 Q35 60 31 64 L25 72 Q21 78 15 78 Q7 78 9 70 L13 58 Q16 48 30 48 Z"
          />
          <circle className="splash-gamepad-dot splash-dot-1" cx="40" cy="54" r="4" />
          <circle className="splash-gamepad-dot splash-dot-2" cx="68" cy="52" r="3.5" />
          <circle className="splash-gamepad-dot splash-dot-3" cx="76" cy="58" r="3.5" />
        </svg>

        <div className="splash-wordmark-group">
          <h1 className="splash-wordmark-main">
            <span className="splash-glow" aria-hidden="true">
              TOURNAMENT
            </span>
            <span className="splash-text">TOURNAMENT</span>
          </h1>
          <p className="splash-wordmark-sub">SYSTEM</p>
        </div>

        {!isError && (
          <div className="splash-bar-track" aria-hidden="true">
            <div className="splash-bar-glow" />
          </div>
        )}

        {isSlow && <p className="splash-status-text">เชื่อมต่อช้ากว่าปกติ รอสักครู่...</p>}

        {isError && (
          <div className="splash-error">
            <p className="splash-status-text">เชื่อมต่อไม่สำเร็จ ลองอีกครั้ง</p>
            <button type="button" className="btn-ghost btn-sm" onClick={onRetry}>
              โหลดใหม่
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
