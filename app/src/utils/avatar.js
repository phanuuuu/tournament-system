const EMOJIS = ["⚽", "🏆", "🦁", "🐯", "🦊", "🐸", "🐵", "🐨", "🐰", "🦄", "🐲", "🐧", "🦉", "🐺", "🐼", "🦅"];
const COLORS = ["#FFB4A2", "#A2D2FF", "#B9FBC0", "#FFD6A5", "#CDB4DB", "#FFC6FF", "#9BF6FF", "#FDFFB6"];

export function generateRandomAvatar() {
  const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="64" fill="${color}"/><text x="50%" y="54%" font-size="64" text-anchor="middle" dominant-baseline="middle">${emoji}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
