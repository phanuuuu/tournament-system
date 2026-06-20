import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { updateUserProfile } from "../firebase/users";
import { uploadProfilePhoto } from "../firebase/storageHelpers";
import { generateRandomAvatar } from "../utils/avatar";

const URL_PATTERN = /^https?:\/\/.+/i;

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const [form, setForm] = useState({ displayName: "", phone: "", facebookName: "", facebookUrl: "", lineId: "" });
  const [photoURL, setPhotoURL] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setForm({
      displayName: profile.displayName || "",
      phone: profile.phone || "",
      facebookName: profile.facebookName || "",
      facebookUrl: profile.facebookUrl || "",
      lineId: profile.lineId || "",
    });
    setPhotoURL(profile.photoURL || null);
  }, [profile]);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0] ?? null;
    setPhotoFile(file);
    if (file) setPhotoURL(URL.createObjectURL(file));
  }

  function handleResetToRandomAvatar() {
    setPhotoFile(null);
    setPhotoURL(generateRandomAvatar());
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!form.displayName.trim()) return setError("กรุณากรอกชื่อที่ใช้แสดง");
    if (!form.phone.trim()) return setError("กรุณากรอกเบอร์โทร");
    if (!form.facebookName.trim()) return setError("กรุณากรอกชื่อเฟซบุ๊ก");
    if (form.facebookUrl.trim() && !URL_PATTERN.test(form.facebookUrl.trim())) {
      return setError("กรุณากรอกลิงก์เฟซบุ๊กให้ถูกต้อง (ต้องขึ้นต้นด้วย http:// หรือ https://)");
    }

    setSubmitting(true);
    try {
      const finalPhotoURL = photoFile ? await uploadProfilePhoto(user.uid, photoFile) : photoURL;
      await updateUserProfile(user.uid, {
        displayName: form.displayName.trim(),
        phone: form.phone.trim(),
        facebookName: form.facebookName.trim(),
        facebookUrl: form.facebookUrl.trim(),
        lineId: form.lineId.trim(),
        photoURL: finalPhotoURL,
      });
      setPhotoFile(null);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!profile) return <p>กำลังโหลด...</p>;

  return (
    <div className="auth-page">
      <h1>โปรไฟล์ของฉัน</h1>
      <form onSubmit={handleSubmit}>
        {photoURL && <img src={photoURL} alt="รูปโปรไฟล์" width={96} height={96} className="profile-photo-preview" />}
        <label>
          เปลี่ยนรูปโปรไฟล์
          <input type="file" accept="image/*" onChange={handlePhotoChange} />
        </label>
        <button type="button" onClick={handleResetToRandomAvatar}>
          สุ่มไอคอนใหม่
        </button>

        <label>
          ชื่อที่ใช้แสดง *
          <input value={form.displayName} onChange={update("displayName")} required />
        </label>
        <label>
          อีเมล (แก้ไม่ได้)
          <input value={user?.email || ""} disabled />
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
          <input type="url" value={form.facebookUrl} onChange={update("facebookUrl")} />
        </label>
        <label>
          Line ID (ไม่บังคับ)
          <input value={form.lineId} onChange={update("lineId")} />
        </label>

        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">บันทึกสำเร็จ</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </form>
    </div>
  );
}
