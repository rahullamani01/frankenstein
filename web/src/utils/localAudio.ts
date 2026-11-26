/**
 * Real local playback via HTML5 Audio, streaming from the FastAPI backend.
 * Replaces the old Web-Audio synthesizer mock.
 */

class LocalAudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private volume = 0.75;
  private preloaded: HTMLAudioElement | null = null;
  private preloadedUrl = '';
  private endedHandler: (() => void) | null = null;
  private timeHandler: ((t: number) => void) | null = null;

  private attach(audio: HTMLAudioElement) {
    audio.onended = () => this.endedHandler?.();
    audio.ontimeupdate = () => this.timeHandler?.(audio.currentTime);
  }

  private ensure(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = "auto";
      this.audio.volume = this.volume;
      this.attach(this.audio);
    }
    return this.audio;
  }

  /** Prime the next file while the current one is still playing. */
  preloadNext(url: string) {
    if (!url || url === this.preloadedUrl) return;
    this.preloadedUrl = url;
    try {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.volume = 0;
      audio.src = url;
      audio.load();
      this.preloaded = audio;
    } catch {
      this.preloaded = null;
    }
  }

  clearPreload() {
    this.preloaded = null;
    this.preloadedUrl = '';
  }

  async playUrl(url: string) {
    // Adopt the element that has already buffered the next song when we can.
    const prepared = this.preloaded && this.preloadedUrl === url ? this.preloaded : null;
    if (prepared) {
      const previousAudio = this.audio;
      previousAudio?.pause();
      this.audio = prepared;
      this.attach(prepared);
      prepared.volume = this.volume;
      prepared.currentTime = 0;
      this.preloaded = null;
      this.preloadedUrl = '';
      try {
        await prepared.play();
        return;
      } catch {
        this.audio = previousAudio;
        if (previousAudio) this.attach(previousAudio);
      }
    }
    const a = this.ensure();
    // Keep the current song recoverable if the new file cannot be loaded.
    const previous = { src: a.src, time: a.currentTime, wasPlaying: !a.paused };
    a.pause();
    a.src = url;
    a.currentTime = 0;
    a.volume = this.volume;
    try {
      await a.play();
    } catch (error) {
      if (previous.src) {
        a.src = previous.src;
        a.currentTime = previous.time;
        if (previous.wasPlaying) await a.play().catch(() => {});
      }
      throw error;
    }
  }

  pause() {
    this.audio?.pause();
  }

  async resume() {
    await this.audio?.play();
  }

  get hasSource(): boolean {
    return !!this.audio?.getAttribute('src');
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
    this.endedHandler = cb;
    this.attach(this.ensure());
  }

  onTimeUpdate(cb: (t: number) => void) {
    this.timeHandler = cb;
    this.attach(this.ensure());
  }
}

export const localAudio = new LocalAudioPlayer();
