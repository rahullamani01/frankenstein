/**
 * Real local playback via HTML5 Audio, streaming from the FastAPI backend.
 * Replaces the old Web-Audio synthesizer mock.
 */

class LocalAudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private volume = 0.75;

  private ensure(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = "auto";
      this.audio.volume = this.volume;
    }
    return this.audio;
  }

  playUrl(url: string) {
    const a = this.ensure();
    a.pause();
    a.src = url;
    a.currentTime = 0;
    a.volume = this.volume;
    void a.play().catch(() => {
      /* autoplay policy — user gesture already happened on click */
    });
  }

  pause() {
    this.audio?.pause();
  }

  resume() {
    void this.audio?.play().catch(() => {});
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute("src");
      this.audio.load();
    }
  }

  seek(seconds: number) {
    if (this.audio && Number.isFinite(seconds)) {
      this.audio.currentTime = Math.max(0, seconds);
    }
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.audio) this.audio.volume = this.volume;
  }

  get currentTime(): number {
    return this.audio?.currentTime ?? 0;
  }

  get duration(): number {
    return this.audio?.duration && Number.isFinite(this.audio.duration)
      ? this.audio.duration
      : 0;
  }

  get paused(): boolean {
    return this.audio?.paused ?? true;
  }

  onEnded(cb: () => void) {
    const a = this.ensure();
    a.onended = cb;
  }

  onTimeUpdate(cb: (t: number) => void) {
    const a = this.ensure();
    a.ontimeupdate = () => cb(a.currentTime);
  }
}

export const localAudio = new LocalAudioPlayer();
