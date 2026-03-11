export function playSound(type) {
  try {
    const audio = new Audio(`${process.env.PUBLIC_URL}/sounds/${type}.mp3`);
    audio.play().catch(() => {});
  } catch (_) {}
}
