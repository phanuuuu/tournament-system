import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createLeague, updateLeagueImage, isValidLeagueSize } from "../firebase/leagues";
import { uploadLeagueImage } from "../firebase/storageHelpers";
import Spinner from "../components/Spinner";
import PageHeader from "../components/PageHeader";

const CUP_SIZES = [4, 8, 16, 32, 64];

export default function AdminCreateLeaguePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [format, setFormat] = useState("cup");
  const [matchType, setMatchType] = useState("single");
  const [size, setSize] = useState(8);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleImageChange(e) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  function handleFormatChange(newFormat) {
    setFormat(newFormat);
    if (newFormat === "cup") {
      setMatchType("single");
      setSize(8);
    } else {
      setSize(8);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!name.trim()) return setError("กรุณากรอกชื่อลีค");
    if (!isValidLeagueSize(format, Number(size))) {
      setError(
        format === "cup"
          ? "ถ้วย: จำนวนผู้เล่นต้องเป็นเลขยกกำลังสอง (4, 8, 16, 32, ...)"
          : "ลีคเก็บแต้ม: จำนวนผู้เล่นต้องเป็นเลขคู่"
      );
      return;
    }

    setSubmitting(true);
    try {
      const ref = await createLeague(user.uid, {
        name: name.trim(),
        format,
        matchType,
        size: Number(size),
      });
      if (imageFile) {
        const url = await uploadLeagueImage(ref.id, imageFile);
        await updateLeagueImage(ref.id, url);
      }
      navigate(`/admin/leagues/${ref.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <PageHeader title="สร้างลีคใหม่" />
      <form onSubmit={handleSubmit}>
        <label>
          ชื่อลีค *
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>

        <div className="league-image-edit">
          {imagePreview && <img src={imagePreview} alt="" className="league-avatar" width={48} height={48} />}
          <label>
            ภาพลีค (ไม่บังคับ)
            <input type="file" accept="image/*" onChange={handleImageChange} />
          </label>
        </div>

        <label>
          รูปแบบการแข่ง *
          <select value={format} onChange={(e) => handleFormatChange(e.target.value)}>
            <option value="cup">ชิงถ้วย (น็อคเอาท์)</option>
            <option value="points">ลีคเก็บแต้ม</option>
          </select>
        </label>

        {format === "points" && (
          <label>
            รูปแบบแมตช์ *
            <select value={matchType} onChange={(e) => setMatchType(e.target.value)}>
              <option value="single">แมตช์เดียว</option>
              <option value="homeAway">เหย้า-เยือน</option>
            </select>
          </label>
        )}
        {format === "cup" && <p>ถ้วยแข่งแมตช์เดียวเสมอ</p>}

        {format === "cup" ? (
          <label>
            จำนวนผู้เล่น (ความจุของลีค) *
            <select value={size} onChange={(e) => setSize(Number(e.target.value))}>
              {CUP_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n} คน
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label>
            จำนวนผู้เล่น (เพดานรับสมัคร ต้องเป็นเลขคู่) *
            <input
              type="number"
              min={2}
              step={2}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              required
            />
          </label>
        )}

        {error && <p className="form-error">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting && <Spinner size="sm" />}
          {submitting ? "กำลังสร้าง..." : "สร้างลีค"}
        </button>
      </form>
    </div>
  );
}
