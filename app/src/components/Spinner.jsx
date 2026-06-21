export default function Spinner({ size = "md" }) {
  return <span className={`spinner spinner-${size}`} role="status" aria-label="กำลังโหลด" />;
}
