const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();
setGlobalOptions({ region: "asia-southeast1" });

// ฟังก์ชันจริง (assign แอดมินคนแรก, เช็คสิทธิ์เห็นเฟซบุ๊กคู่แข่ง) จะเพิ่มในเฟส 2
