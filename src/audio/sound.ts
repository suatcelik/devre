// Ses yöneticisi (DEVRE_TASKS 3.6.1): sesleri önceden yükler, efekt ve müzik ayrı kapatılır.
// Sesler scripts/generate-sounds.mjs ile sentezlenir.
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { AppState } from 'react-native';

const SFX = {
  place: require('../../assets/sounds/place.wav'),
  pickup: require('../../assets/sounds/pickup.wav'),
  invalid: require('../../assets/sounds/invalid.wav'),
  pop: require('../../assets/sounds/pop.wav'),
  lamp: require('../../assets/sounds/lamp.wav'),
  jingle: require('../../assets/sounds/jingle.wav'),
  line: require('../../assets/sounds/line.wav'),
  tray: require('../../assets/sounds/tray.wav'),
  gameover: require('../../assets/sounds/gameover.wav'),
  star1: require('../../assets/sounds/star_1.wav'),
  star2: require('../../assets/sounds/star_2.wav'),
  star3: require('../../assets/sounds/star_3.wav'),
  confetti: require('../../assets/sounds/confetti.wav'),
} as const;

/** C majör pentatonik, C5'ten üç oktav: akım her hücrede bir nota yükselir. */
const NOTES = [
  require('../../assets/sounds/note_00.wav'),
  require('../../assets/sounds/note_01.wav'),
  require('../../assets/sounds/note_02.wav'),
  require('../../assets/sounds/note_03.wav'),
  require('../../assets/sounds/note_04.wav'),
  require('../../assets/sounds/note_05.wav'),
  require('../../assets/sounds/note_06.wav'),
  require('../../assets/sounds/note_07.wav'),
  require('../../assets/sounds/note_08.wav'),
  require('../../assets/sounds/note_09.wav'),
  require('../../assets/sounds/note_10.wav'),
  require('../../assets/sounds/note_11.wav'),
  require('../../assets/sounds/note_12.wav'),
  require('../../assets/sounds/note_13.wav'),
  require('../../assets/sounds/note_14.wav'),
];
const MUSIC = require('../../assets/sounds/music.wav');

export type SfxName = keyof typeof SFX;

/** Efekt başına ses düzeyi; ince ayar buradan. */
const VOLUME: Record<SfxName, number> = {
  place: 0.8,
  pickup: 0.45,
  invalid: 0.55,
  pop: 0.5,
  lamp: 0.75,
  jingle: 0.7,
  line: 0.6,
  tray: 0.4,
  gameover: 0.6,
  star1: 0.75,
  star2: 0.75,
  star3: 0.8,
  confetti: 0.55,
};
const NOTE_VOLUME = 0.6;
/** Arka plan müziği varsayılan olarak düşük (DEVRE_TASKS 3.6). */
const MUSIC_VOLUME = 0.28;
/** Aynı efektin üst üste çalabilmesi için oyuncu sayısı. */
const POOL: Partial<Record<SfxName, number>> = { pop: 4, place: 2, pickup: 2 };

class Pool {
  private players: AudioPlayer[];
  private next = 0;
  constructor(source: number, size: number, volume: number) {
    this.players = Array.from({ length: size }, () => {
      const p = createAudioPlayer(source);
      p.volume = volume;
      return p;
    });
  }
  play() {
    const p = this.players[this.next];
    this.next = (this.next + 1) % this.players.length;
    p.seekTo(0).then(() => p.play()).catch(() => undefined);
  }
}

let sfx: Record<SfxName, Pool> | null = null;
let notes: Pool[] = [];
let music: AudioPlayer | null = null;
let sfxOn = true;
let musicOn = true;
let appActive = true;

function ensureLoaded() {
  if (sfx) return;
  sfx = Object.fromEntries(
    (Object.keys(SFX) as SfxName[]).map((k) => [k, new Pool(SFX[k], POOL[k] ?? 1, VOLUME[k])]),
  ) as Record<SfxName, Pool>;
  notes = NOTES.map((src) => new Pool(src, 1, NOTE_VOLUME));
  music = createAudioPlayer(MUSIC);
  music.loop = true;
  music.volume = MUSIC_VOLUME;
}

function syncMusic() {
  if (!music) return;
  if (musicOn && appActive) music.play();
  else music.pause();
}

/** Uygulama açılışında bir kez çağrılır: ses oturumu + önceden yükleme. */
export async function initAudio(settings: { sound: boolean; music: boolean }) {
  try {
    // Telefonun sessiz anahtarına uyar; kullanıcının kendi müziğiyle karışır.
    await setAudioModeAsync({
      playsInSilentMode: false,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
    });
  } catch {
    // Ses oturumu kurulamazsa oyun sessiz devam eder.
  }
  ensureLoaded();
  sfxOn = settings.sound;
  musicOn = settings.music;
  syncMusic();
  AppState.addEventListener('change', (state) => {
    appActive = state === 'active';
    syncMusic();
  });
}

export function setSoundEnabled(on: boolean) {
  sfxOn = on;
}

export function setMusicEnabled(on: boolean) {
  musicOn = on;
  syncMusic();
}

export function playSfx(name: SfxName) {
  if (!sfxOn || !sfx) return;
  sfx[name].play();
}

/** Akımın i. hücresindeki nota; 15'ten uzun devrelerde en tiz nota tekrar eder. */
export function playNote(i: number) {
  if (!sfxOn || notes.length === 0) return;
  notes[Math.min(i, notes.length - 1)].play();
}
