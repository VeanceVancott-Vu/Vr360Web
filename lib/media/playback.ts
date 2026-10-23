type PlayableAudio = Pick<HTMLAudioElement, "play">;

export async function playAudio(
  audio: PlayableAudio,
  onStarted: () => void,
  onRejected: () => void,
): Promise<void> {
  try {
    await audio.play();
  } catch {
    onRejected();
    return;
  }
  onStarted();
}
