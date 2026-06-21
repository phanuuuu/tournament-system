import { useToastList } from "../context/ToastContext";

const ICON_BY_TYPE = { success: "✅", error: "⚠️", info: "ℹ️" };

export default function ToastContainer() {
  const { toasts, dismissToast } = useToastList();

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`toast toast-${t.type}`}
          onClick={() => dismissToast(t.id)}
        >
          <span className="toast-icon">{ICON_BY_TYPE[t.type] ?? ICON_BY_TYPE.info}</span>
          <span>{t.message}</span>
        </button>
      ))}
    </div>
  );
}
