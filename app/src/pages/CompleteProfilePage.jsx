import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createUserProfile } from "../firebase/users";
import { generateRandomAvatar } from "../utils/avatar";

const URL_PATTERN = /^https?:\/\/.+/i;

export default function CompleteProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    displayName: user?.displayName || "",
    phone: "",
    facebookName: "",
    facebookUrl: "",
    lineId: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.displayName.trim()) return setError("กรุณากรอกชื่อที่ใช้แสดง");
    if (!form.phone.trim()) return setError("กรุณากรอกเบอร์โทร");
    if (!form.facebookName.trim()) return setError("กรุณากรอกชื่อเฟซบุ๊ก");
    if (form.facebookUrl.trim() && !URL_PATTERN.test(form.facebookUrl.trim())) {
      return setError("กรุณากรอกลิงก์เฟซบุ๊กให้ถูกต้อง (ต้องขึ้นต้นด้วย http:// หรือ https://)");
    }

    setSubmitting(true);
    try {
      await createUserProfile(user.uid, {
        displayName: form.displayName.trim(),
        phone: form.phone.trim(),
        facebookName: form.facebookName.trim(),
        facebookUrl: form.facebookUrl.trim(),
        lineId: form.lineId.trim(),
        photoURL: user.photoURL || generateRandomAvatar(),
      });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <h1>กรอกข้อมูลเพิ่มเติม</h1>
      <p>เข้าสู่ระบบด้วย Google สำเร็จแล้ว ขอข้อมูลเพิ่มอีกเล็กน้อยก่อนเริ่มใช้งาน</p>
      <form onSubmit={handleSubmit}>
        <label>
          ชื่อที่ใช้แสดง *
          <input value={form.displayName} onChange={update("displayName")} required />
        </label>
        <label>
          เบอร์โทร *
          <input value={form.phone} onChange={update("phone")} required />
        </label>
        <label>
          ชื่อเฟซบุ๊ก *
          <input value={form.facebookName} onChange={update("facebookName")} required />
        </label>
        <label>
          ลิงก์เฟซบุ๊ก (ไม่บังคับ)
          <input
            type="url"
            placeholder="https://facebook.com/username"
            value={form.facebookUrl}
            onChange={update("facebookUrl")}
          />
        </label>
        <label>
          Line ID (ไม่บังคับ)
          <input value={form.lineId} onChange={update("lineId")} />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? "กำลังบันทึก..." : "เริ่มใช้งาน"}
        </button>
      </form>
    </div>
  );
}
