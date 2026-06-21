const WORDMARK_CHUNKS = ["ระบบ", "จัดการ", "แข่งเกม"];

// splash ตอนเปิดแอป (รอ Firebase Auth resolve ครั้งแรก) — คนละตัวกับ Skeleton ที่ใช้ตอนดึงข้อมูลในหน้าต่าง ๆ
export default function SplashScreen({ phase, onRetry }) {
  const isFading = phase === "fade";
  const isError = phase === "error";
  const isSlow = phase === "slow";

  return (
    <div className={`splash-screen ${isFading ? "splash-fade-out" : ""}`} role="status" aria-live="polite">
      <div className="splash-content">
        <h1 className="splash-wordmark">
          <span className="splash-glow" aria-hidden="true">
            {WORDMARK_CHUNKS.join("")}
          </span>
          <span className="splash-text">
            {WORDMARK_CHUNKS.map((chunk, i) => (
              <span key={i} className="splash-chunk" style={{ animationDelay: `${i * 140}ms` }}>
                {chunk}
              </span>
            ))}
          </span>
        </h1>

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
