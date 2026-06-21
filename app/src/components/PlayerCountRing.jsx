const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function PlayerCountRing({ count, size }) {
  const ratio = size > 0 ? Math.min(1, count / size) : 0;
  const offset = CIRCUMFERENCE * (1 - ratio);
  const full = size > 0 && count >= size;

  return (
    <div className={`player-ring ${full ? "player-ring-full" : ""}`}>
      <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
        <circle className="player-ring-track" cx="20" cy="20" r={RADIUS} />
        <circle
          className="player-ring-fill"
          cx="20"
          cy="20"
          r={RADIUS}
          style={{ strokeDasharray: CIRCUMFERENCE, strokeDashoffset: offset }}
        />
      </svg>
      <span className="player-ring-label">
        {count}/{size}
      </span>
    </div>
  );
}
