const { setGlobalOptions } = require("firebase-functions/v2");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
setGlobalOptions({ region: "asia-southeast1" });

const db = admin.firestore();

function publicFields(data) {
  return { displayName: data.displayName, photoURL: data.photoURL ?? null };
}

// ผู้ใช้คนแรกที่สมัครกลายเป็นแอดมินถาวรโดยอัตโนมัติ + mirror ข้อมูลสาธารณะ
exports.onUserCreate = onDocumentCreated("users/{uid}", async (event) => {
  const uid = event.params.uid;
  const data = event.data.data();

  await db.runTransaction(async (tx) => {
    const adminMetaRef = db.doc("meta/admin");
    const adminMetaSnap = await tx.get(adminMetaRef);

    if (!adminMetaSnap.exists || adminMetaSnap.data().assigned !== true) {
      tx.set(adminMetaRef, { assigned: true, uid });
      tx.update(db.doc(`users/${uid}`), { role: "admin" });
    }

    tx.set(db.doc(`publicProfiles/${uid}`), publicFields(data));
  });
});

// แก้โปรไฟล์แล้ว mirror ชื่อ/รูปไปที่ publicProfiles ให้ตรงกันเสมอ
exports.onUserUpdate = onDocumentUpdated("users/{uid}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  if (before.displayName === after.displayName && before.photoURL === after.photoURL) {
    return;
  }

  await db.doc(`publicProfiles/${event.params.uid}`).set(publicFields(after));
});

// คืนลิงก์เฟซบุ๊กของคู่แข่งในแมตช์เดียวกัน — แอดมินอ่านเฟซบุ๊กของใครก็ได้ตรงจาก users/{uid}
// ผ่าน firestore.rules อยู่แล้ว จึงไม่ต้องใช้ฟังก์ชันนี้ ฟังก์ชันนี้มีไว้สำหรับ "คู่แข่ง" เท่านั้น
exports.getOpponentContact = onCall(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "ต้องล็อกอินก่อน");
  }

  const { matchId } = request.data;
  if (!matchId) {
    throw new HttpsError("invalid-argument", "ต้องระบุ matchId");
  }

  const matchSnap = await db.doc(`matches/${matchId}`).get();
  if (!matchSnap.exists) {
    throw new HttpsError("not-found", "ไม่พบแมตช์นี้");
  }

  const { home, away } = matchSnap.data().players;
  if (callerUid !== home && callerUid !== away) {
    throw new HttpsError("permission-denied", "เห็นได้เฉพาะคู่แข่งในแมตช์เดียวกันเท่านั้น");
  }

  const opponentUid = callerUid === home ? away : home;
  const opponentSnap = await db.doc(`users/${opponentUid}`).get();
  if (!opponentSnap.exists) {
    throw new HttpsError("not-found", "ไม่พบข้อมูลคู่แข่ง");
  }

  return {
    facebookName: opponentSnap.data().facebookName ?? null,
    facebookUrl: opponentSnap.data().facebookUrl ?? null,
  };
});

const MATCH_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

async function generateUniqueMatchCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += MATCH_CODE_ALPHABET[Math.floor(Math.random() * MATCH_CODE_ALPHABET.length)];
    }
    const existing = await db.collection("matches").where("matchCode", "==", code).limit(1).get();
    if (existing.empty) return code;
  }
  throw new Error("ไม่สามารถสร้างรหัสแมตช์ได้");
}

function matchWinner(match) {
  const { scoreHome, scoreAway, penaltyHome, penaltyAway } = match.approvedResult;
  if (scoreHome > scoreAway) return match.players.home;
  if (scoreAway > scoreHome) return match.players.away;
  return penaltyHome > penaltyAway ? match.players.home : match.players.away;
}

// เมื่อแมตช์ถ้วยถูกอนุมัติหรือได้ชนะบาย (ไม่ว่าจะครั้งแรกหรือแอดมินแก้ผลซ้ำหลังย้อนรอบ) เช็คว่ารอบนี้ครบหมดยัง
// ถ้าครบ: สร้างรอบถัดไปจากผู้ชนะ (สายตายตัว) หรือถ้าเป็นรอบสุดท้ายก็ปิดลีค
// เช็ค "รอบถัดไปมีอยู่แล้วหรือยัง" แทนการเช็ค before.status เพื่อให้แก้ผลซ้ำหลังย้อนรอบแล้ว trigger สร้างรอบใหม่ได้อีก
exports.onMatchApproved = onDocumentUpdated("matches/{matchId}", async (event) => {
  const after = event.data.after.data();

  if ((after.status !== "approved" && after.status !== "walkover") || after.kind !== "regular") {
    return;
  }

  const leagueRef = db.doc(`leagues/${after.leagueId}`);
  const leagueSnap = await leagueRef.get();
  if (!leagueSnap.exists) return;
  const league = leagueSnap.data();
  if (league.format !== "cup" || after.round !== league.currentRound) {
    return;
  }
  if (league.status !== "ongoing" && league.status !== "finished") return;

  const round = league.currentRound;
  const roundMatchesSnap = await db
    .collection("matches")
    .where("leagueId", "==", after.leagueId)
    .where("round", "==", round)
    .get();
  const roundMatches = roundMatchesSnap.docs.map((d) => d.data());

  const allDone = roundMatches.every((m) => m.status === "approved" || m.status === "walkover");
  if (!allDone) return;

  roundMatches.sort((a, b) => a.slot - b.slot);
  const winners = roundMatches.map((m) =>
    m.status === "walkover" ? m.walkover.winnerUid : matchWinner(m)
  );

  if (winners.length === 1) {
    if (league.status === "ongoing") {
      await leagueRef.update({ status: "finished", finishedAt: admin.firestore.FieldValue.serverTimestamp() });
    }
    return;
  }

  // กันสร้างรอบถัดไปซ้ำ ถ้ามีอยู่แล้ว (เคย advance ไปแล้วในการรันครั้งก่อน)
  const nextRoundSnap = await db
    .collection("matches")
    .where("leagueId", "==", after.leagueId)
    .where("round", "==", round + 1)
    .limit(1)
    .get();
  if (!nextRoundSnap.empty) return;

  const batch = db.batch();
  for (let i = 0; i < winners.length; i += 2) {
    const matchCode = await generateUniqueMatchCode();
    const ref = db.collection("matches").doc();
    batch.set(ref, {
      leagueId: after.leagueId,
      kind: "regular",
      round: round + 1,
      slot: i / 2,
      leg: null,
      players: { home: winners[i], away: winners[i + 1] },
      matchCode,
      status: "scheduled",
      submissions: {},
      submissionHistory: [],
      approvedResult: null,
      walkover: null,
      contactUnreachable: {},
      hasContactIssue: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  batch.update(leagueRef, { currentRound: round + 1 });
  await batch.commit();
});

async function getAdminUid() {
  const metaSnap = await db.doc("meta/admin").get();
  return metaSnap.exists ? metaSnap.data().uid : null;
}

async function notify(userId, type, { leagueId = null, matchId = null } = {}) {
  if (!userId) return;
  await db.collection("notifications").add({
    userId,
    type,
    leagueId,
    matchId,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// แมตช์ใหม่ที่เกิดจากการ "เข้ารอบ" (round > 1) เท่านั้น — รอบแรกของลีคไม่ถือเป็นการเข้ารอบ
exports.onMatchCreatedNotify = onDocumentCreated("matches/{matchId}", async (event) => {
  const match = event.data.data();
  if (match.kind !== "regular" || !match.round || match.round <= 1) return;

  await Promise.all([
    notify(match.players.home, "advanced_round", { leagueId: match.leagueId, matchId: event.params.matchId }),
    notify(match.players.away, "advanced_round", { leagueId: match.leagueId, matchId: event.params.matchId }),
  ]);
});

// แจ้งเตือนตามการเปลี่ยนสถานะแมตช์: ผลรอยืนยัน / อนุมัติแล้ว / ข้อพิพาท / แข่งใหม่
exports.onMatchUpdatedNotify = onDocumentUpdated("matches/{matchId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  const matchId = event.params.matchId;
  const { leagueId, players } = after;

  if (before.status !== "one_submitted" && after.status === "one_submitted") {
    const submittedUid = Object.keys(after.submissions)[0];
    const waitingUid = submittedUid === players.home ? players.away : players.home;
    await notify(waitingUid, "opponent_submitted", { leagueId, matchId });
  }

  const wasFinal = before.status === "approved" || before.status === "walkover";
  const isFinal = after.status === "approved" || after.status === "walkover";
  if (!wasFinal && isFinal) {
    await Promise.all([
      notify(players.home, "match_approved", { leagueId, matchId }),
      notify(players.away, "match_approved", { leagueId, matchId }),
    ]);
  }

  if (before.status !== "disputed" && after.status === "disputed") {
    await notify(await getAdminUid(), "admin_dispute", { leagueId, matchId });
  }

  if (!before.hasContactIssue && after.hasContactIssue) {
    await notify(await getAdminUid(), "admin_contact_issue", { leagueId, matchId });
  }

  // ให้แข่งใหม่: ผลถูกเคลียร์กลับเป็น scheduled และมีของเก่าถูกเก็บเข้า submissionHistory เพิ่ม
  const replayed =
    after.status === "scheduled" &&
    before.status !== "scheduled" &&
    (after.submissionHistory?.length ?? 0) > (before.submissionHistory?.length ?? 0);
  if (replayed) {
    await Promise.all([
      notify(players.home, "replay_requested", { leagueId, matchId }),
      notify(players.away, "replay_requested", { leagueId, matchId }),
    ]);
  }
});
