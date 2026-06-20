// ตัดตัวที่อ่าน/ฟังสับสนออก: 0/O, 1/I/l
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function randomMatchCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}
