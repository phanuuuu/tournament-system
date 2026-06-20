import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/config";
import { createUserProfile } from "../firebase/users";
import { uploadProfilePhoto } from "../firebase/storageHelpers";
import { generateRandomAvatar } from "../utils/avatar";

const URL_PATTERN = /^https?:\/\/.+/i;

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    phone: "",
    facebookName: "",
    facebookUrl: "",
    lineId: "",
  });
  const [photoFile, setPhotoFile] = useState(null);
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
      const cred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      const photoURL = photoFile
        ? await uploadProfilePhoto(cred.user.uid, photoFile)
        : generateRandomAvatar();

      await createUserProfile(cred.user.uid, {
        displayName: form.displayName.trim(),
        phone: form.phone.trim(),
        facebookName: form.facebookName.trim(),
        facebookUrl: form.facebookUrl.trim(),
        lineId: form.lineId.trim(),
        photoURL,
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
      <h1>สมัครสมาชิก</h1>
      <form onSubmit={handleSubmit}>
        <label>
          ชื่อที่ใช้แสดง *
          <input value={form.displayName} onChange={update("displayName")} required />
        </label>
        <label>
          อีเมล *
          <input type="email" value={form.email} onChange={update("email")} required />
        </label>
        <label>
          รหัสผ่าน *
          <input type="password" value={form.password} onChange={update("password")} required minLength={6} />
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
        <label>
          รูปโปรไฟล์ (ไม่บังคับ — ถ้าไม่ใส่ระบบจะสุ่มไอคอนให้)
          <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? "กำลังสมัคร..." : "สมัครสมาชิก"}
        </button>
      </form>
      <p>
        มีบัญชีแล้ว? <Link to="/login">เข้าสู่ระบบ</Link>
      </p>
    </div>
  );
}
