import { doc, getDoc, updateDoc, runTransaction, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "./config";

function submissionsMatch(a, b) {
  return (
    a.scoreHome === b.scoreHome &&
    a.scoreAway === b.scoreAway &&
    (a.penaltyHome ?? null) === (b.penaltyHome ?? null) &&
    (a.penaltyAway ?? null) === (b.penaltyAway ?? null)
  );
}

// uid ผู้ส่ง + สกอร์ในมุมมอง home/away (แปลงจาก "สกอร์ของฉัน/คู่แข่ง" ไว้ก่อนเรียกฟังก์ชันนี้)
// ใช้ transaction กันสองฝั่งส่งพร้อมกันแล้วข้อมูลกันหายระหว่างกัน
export async function submitMatchResult(matchId, uid, { scoreHome, scoreAway, penaltyHome, penaltyAway, photoURL }) {
  const matchRef = doc(db, "matches", matchId);

  await runTransaction(db, async (tx) => {
    const matchSnap = await tx.get(matchRef);
    if (!matchSnap.exists()) throw new Error("ไม่พบแมตช์นี้");
    const match = matchSnap.data();

    if (match.status === "approved") {
      throw new Error("ผลแมตช์นี้อนุมัติแล้ว แก้ไขเองไม่ได้");
    }

    const mySubmission = {
      scoreHome,
      scoreAway,
      penaltyHome: penaltyHome ?? null,
      penaltyAway: penaltyAway ?? null,
      photoURL: photoURL ?? null,
      submittedAt: Timestamp.now(),
    };

    const submissions = { ...match.submissions, [uid]: mySubmission };
    const { home, away } = match.players;
    const bothSubmitted = submissions[home] && submissions[away];

    if (!bothSubmitted) {
      tx.update(matchRef, { submissions, status: "one_submitted" });
      return;
    }

    if (submissionsMatch(submissions[home], submissions[away])) {
      tx.update(matchRef, {
        submissions,
        status: "approved",
        approvedResult: {
          scoreHome: submissions[home].scoreHome,
          scoreAway: submissions[home].scoreAway,
          penaltyHome: submissions[home].penaltyHome,
          penaltyAway: submissions[home].penaltyAway,
          decidedBy: "auto",
          decidedAt: serverTimestamp(),
          adminChoiceUid: null,
          isReplay: false,
        },
      });
    } else {
      tx.update(matchRef, { submissions, status: "disputed" });
    }
  });
}

export async function resolveDisputeUseSubmission(matchId, chosenUid) {
  const matchRef = doc(db, "matches", matchId);
  const matchSnap = await getDoc(matchRef);
  if (!matchSnap.exists()) throw new Error("ไม่พบแมตช์นี้");
  const chosen = matchSnap.data().submissions[chosenUid];
  if (!chosen) throw new Error("ไม่พบผลที่ส่งของผู้เล่นคนนี้");

  await updateDoc(matchRef, {
    status: "approved",
    approvedResult: {
      scoreHome: chosen.scoreHome,
      scoreAway: chosen.scoreAway,
      penaltyHome: chosen.penaltyHome ?? null,
      penaltyAway: chosen.penaltyAway ?? null,
      decidedBy: "admin",
      decidedAt: serverTimestamp(),
      adminChoiceUid: chosenUid,
      isReplay: false,
    },
  });
}

export async function resolveDisputeReplay(matchId) {
  const matchRef = doc(db, "matches", matchId);
  const matchSnap = await getDoc(matchRef);
  if (!matchSnap.exists()) throw new Error("ไม่พบแมตช์นี้");
  const match = matchSnap.data();

  await updateDoc(matchRef, {
    submissionHistory: [...(match.submissionHistory ?? []), { submissions: match.submissions, archivedAt: Timestamp.now() }],
    submissions: {},
    status: "scheduled",
  });
}
