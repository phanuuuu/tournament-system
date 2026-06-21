import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createLeague, isValidLeagueSize } from "../firebase/leagues";
import Spinner from "../components/Spinner";

const CUP_SIZES = [4, 8, 16, 32, 64];

export default function AdminCreateLeaguePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [format, setFormat] = useState("cup");
  const [matchType, setMatchType] = useState("single");
  const [size, setSize] = useState(8);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      navigate(`/admin/leagues/${ref.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1>สร้างลีคใหม่</h1>
      <form onSubmit={handleSubmit}>
        <label>
          ชื่อลีค *
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>

        <label>
          รูปแบบการแข่ง *
          <select value={format} onChange={(e) => handleFormatChange(e.target.value)}>
            <option value="cup">ชิงถ้วย (น็อคเอาท์)</option>
            <option value="points">ลีคเก็บแต้ม</option>
          </select>
        </label>

        {format === "points" && (
          <label>
            รูปแบบนัด *
            <select value={matchType} onChange={(e) => setMatchType(e.target.value)}>
              <option value="single">นัดเดียว</option>
              <option value="homeAway">เหย้า-เยือน</option>
            </select>
          </label>
        )}
        {format === "cup" && <p>ถ้วยแข่งนัดเดียวเสมอ</p>}

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
