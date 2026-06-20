import { collection, doc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "./config";

export function subscribeToByeBans(leagueId, callback) {
  return onSnapshot(collection(db, "leagues", leagueId, "byeBans"), (snap) => {
    const map = {};
    snap.docs.forEach((d) => {
      map[d.id] = d.data();
    });
    callback(map);
  });
}

// แพ้บาย (เฉพาะลีคเก็บแต้ม) — เป็น override ที่ถอดได้ ไม่แตะผลแมตช์จริงเลย
// ตารางคะแนนจะ "มองทะลุ" เข้าไปนับเป็นแพ้ 3-0 ทุกแมตช์ของคนนี้ตอนคำนวณ (ดู computeStandings)
export async function setByeBan(leagueId, uid, active, adminUid) {
  const ref = doc(db, "leagues", leagueId, "byeBans", uid);
  if (active) {
    await setDoc(ref, { active: true, bannedAt: serverTimestamp(), bannedBy: adminUid });
  } else {
    await setDoc(ref, { active: false, unbannedAt: serverTimestamp(), unbannedBy: adminUid }, { merge: true });
  }
}
