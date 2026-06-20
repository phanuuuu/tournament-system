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
