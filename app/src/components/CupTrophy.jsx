// ถ้วยวาดเองล้วน ๆ ด้วย SVG (ไม่ใช้ภาพ/โลโก้/ดาวของแบรนด์ใด ๆ) — ทรงหูโค้งใหญ่สองข้างทั่วไปแบบถ้วยแชมป์
export default function CupTrophy({ lit = false, size = 120 }) {
  return (
    <svg
      viewBox="0 0 200 240"
      width={size}
      height={size * 1.2}
      className={`cup-trophy ${lit ? "cup-trophy-lit" : ""}`}
      role="img"
      aria-label={lit ? "ถ้วยแชมป์ติดไฟ" : "ถ้วยแชมป์"}
    >
      <defs>
        <linearGradient id="cupTrophyBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" className="cup-trophy-stop-1" />
          <stop offset="45%" className="cup-trophy-stop-2" />
          <stop offset="100%" className="cup-trophy-stop-3" />
        </linearGradient>
      </defs>

      {/* หูโค้งซ้าย */}
      <path
        d="M58 48 C20 48 8 78 18 104 C26 126 46 134 64 130"
        fill="none"
        className="cup-trophy-stroke"
        strokeWidth="9"
        strokeLinecap="round"
      />
      {/* หูโค้งขวา */}
      <path
        d="M142 48 C180 48 192 78 182 104 C174 126 154 134 136 130"
        fill="none"
        className="cup-trophy-stroke"
        strokeWidth="9"
        strokeLinecap="round"
      />

      {/* บอดี้ถ้วย */}
      <path
        d="M62 38 H138 C138 84 130 112 100 138 C70 112 62 84 62 38 Z"
        fill="url(#cupTrophyBody)"
        className="cup-trophy-stroke"
        strokeWidth="3"
      />
      {/* ปากถ้วย */}
      <ellipse cx="100" cy="38" rx="38" ry="9" fill="url(#cupTrophyBody)" className="cup-trophy-stroke" strokeWidth="3" />

      {/* ก้าน */}
      <path d="M92 138 H108 L104 176 H96 Z" fill="url(#cupTrophyBody)" className="cup-trophy-stroke" strokeWidth="3" />

      {/* ฐาน 2 ชั้น */}
      <rect x="74" y="176" width="52" height="14" rx="4" fill="url(#cupTrophyBody)" className="cup-trophy-stroke" strokeWidth="3" />
      <rect x="62" y="190" width="76" height="16" rx="5" fill="url(#cupTrophyBody)" className="cup-trophy-stroke" strokeWidth="3" />
    </svg>
  );
}
