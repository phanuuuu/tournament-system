export default function ScoreStepper({ label, value, onChange, disabled, required }) {
  const num = value === "" ? null : Number(value);

  function step(delta) {
    const next = Math.max(0, (num ?? 0) + delta);
    onChange(String(next));
  }

  return (
    <label className="score-stepper">
      <span className="score-stepper-label">{label}</span>
      <div className="score-stepper-control">
        <button
          type="button"
          className="btn-ghost score-stepper-btn"
          onClick={() => step(-1)}
          disabled={disabled || !num}
          aria-label={`ลด ${label}`}
        >
          −
        </button>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          className="score-stepper-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
        />
        <button
          type="button"
          className="btn-ghost score-stepper-btn"
          onClick={() => step(1)}
          disabled={disabled}
          aria-label={`เพิ่ม ${label}`}
        >
          +
        </button>
      </div>
    </label>
  );
}
