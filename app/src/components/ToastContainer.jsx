import { CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { useToastList } from "../context/ToastContext";

const ICON_BY_TYPE = { success: CheckCircle2, error: AlertTriangle, info: Info };

export default function ToastContainer() {
  const { toasts, dismissToast } = useToastList();

  return (
    <div className="toast-container">
      {toasts.map((t) => {
        const Icon = ICON_BY_TYPE[t.type] ?? ICON_BY_TYPE.info;
        return (
          <button
            key={t.id}
            type="button"
            className={`toast toast-${t.type}`}
            onClick={() => dismissToast(t.id)}
          >
            <span className="toast-icon">
              <Icon size={16} />
            </span>
            <span>{t.message}</span>
          </button>
        );
      })}
    </div>
  );
}
