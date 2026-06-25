import { useId, useRef } from "react";
import { Upload, ImageIcon, X } from "lucide-react";

// แค่ trigger UI + พรีวิว — ไม่แตะ logic อัปโหลดเลย พ่อแม่ยังเป็นเจ้าของ photoFile/preview เหมือนเดิม
// onChange(file) เรียกเหมือน <input onChange> เดิมทุกประการ (file ตอนเลือกใหม่, null ตอนล้าง/กดลบ)
export default function PhotoUploadField({ previewURL, fileName, isNewFile, onChange, disabled }) {
  const inputId = useId();
  const inputRef = useRef(null);

  function handlePick(e) {
    onChange(e.target.files?.[0] ?? null);
  }

  function handleRemove() {
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="photo-upload-field">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        onChange={handlePick}
        disabled={disabled}
        className="photo-upload-input-hidden"
      />

      {!previewURL ? (
        <label htmlFor={inputId} className={`photo-upload-trigger ${disabled ? "photo-upload-trigger-disabled" : ""}`}>
          <Upload size={18} aria-hidden="true" />
          แนบรูปผล (ไม่บังคับ)
        </label>
      ) : (
        <div className="photo-upload-preview">
          <img src={previewURL} alt="" className="photo-upload-thumb" />
          <div className="photo-upload-meta">
            <span className="photo-upload-filename">
              <ImageIcon size={14} aria-hidden="true" />
              {fileName ?? (isNewFile ? "รูปที่เลือกใหม่" : "รูปที่ส่งไว้ก่อนหน้า")}
            </span>
            <div className="photo-upload-actions">
              <label htmlFor={inputId} className="btn-ghost btn-sm">
                เปลี่ยนรูป
              </label>
              <button type="button" className="btn-ghost btn-sm" onClick={handleRemove} disabled={disabled}>
                <X size={14} aria-hidden="true" /> ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
