import { AccessibilityInfo } from 'react-native';
import { create } from 'zustand';

import { Timeline, buildTimeline } from '../anim/timeline';
import { setHapticsEnabled } from '../audio/haptics';
import { initAudio, setMusicEnabled, setSoundEnabled } from '../audio/sound';
import { applyMove, newGame } from '../game';
import { place } from '../game/placement';
import { encodeBoard } from '../daily/boardCode';
import type { DailyResult } from '../daily/daily';
import { DailyMove, dailySeed } from '../online/verify';
import { AddFriendResult, Profile, addFriend, cleanNickname, connect, onlineConfigured, setNickname, submitDaily } from '../online/api';
import { flushDaily } from '../online/sync';
import {
  EMPTY_INVENTORY,
  Inventory,
  PowerupKind,
  PowerupResult,
  START_COINS,
  addPowerups,
  applyHammer,
  applyLightning,
  applyRotate,
  applyShuffle,
  buyPowerup,
  earnedFromMove,
  levelCoins,
} from '../game/powerups';
import type { GameState } from '../game/types';
import { LevelData, Outcome, getLevel, levelOutcome, levelState, nextLevel, pickLevelSeed } from '../levels';
import type { Vision } from '../theme/colorVision';
import { TUTORIAL_STEPS, nextHint, tutorialState } from '../tutorial/steps';
import {
  DEFAULT_SETTINGS,
  EMPTY_PROGRESS,
  Progress,
  Settings,
  loadBest,
  loadCoins,
  loadDailyHistory,
  loadPowerups,
  loadProgress,
  loadSettings,
  loadOnboarded,
  loadTutorialDone,
  saveBest,
  saveCoins,
  saveDailyHistory,
  savePowerups,
  saveProgress,
  saveSettings,
  saveOnboarded,
  saveTutorialDone,
} from './storage';

export type PlayMode = 'endless' | 'daily';
export type GameMode = PlayMode | 'tutorial' | 'level';
/** Öğretici bitince nereye gidilecek: bir oyun modu ya da macera (sıradaki bölüm) */
export type TutorialNext = PlayMode | 'adventure';

export interface ActiveTimeline {
  /** Her hamlede artar; çizim katmanı saati bununla sıfırlar. */
  id: number;
  tl: Timeline;
  /** Hamleden önceki puan (sayaç buradan yuvarlanır). */
  scoreBefore: number;
}

export interface TutorialProgress {
  step: number;
  /** Öğretici bitince açılacak mod */
  next: TutorialNext;
  /** Son adım tamamlandı; "Hazırsın!" paneli gösterilir. */
  finished: boolean;
}

interface GameStore {
  mode: GameMode;
  game: GameState;
  best: number;
  /** Oyun başladığındaki en iyi puan: rekor yıldızı bununla karşılaştırılır. */
  bestAtStart: number;
  settings: Settings;
  /** İlk açılış öğreticisi bir kez tamamlandı/geçildi mi */
  tutorialDone: boolean;
  tutorial: TutorialProgress | null;
  /** Kayıtlı veriler yüklendi (açılış ekranı bunu bekler) */
  ready: boolean;
  /** İlk açılış tanıtımı görüldü mü */
  onboarded: boolean;
  /** Tanıtımı bitirir (ya da geçer); bir daha gösterilmez. */
  finishOnboarding(): void;
  /** Macera modunda oynanan bölüm */
  level: LevelData | null;
  /** Bölüm bitti (kazanıldı/kaybedildi); hamle animasyonu bitince dolar ve sonuç paneli açılır. */
  levelEnd: Exclude<Outcome, { status: 'playing' }> | null;
  /** Bölümün önceki en iyi yıldızı (sonuç panelinde "yeni" yıldızları göstermek için) */
  levelStarsBefore: number;
  progress: Progress;
  /** Joker envanteri (4.10) */
  powerups: Inventory;
  /** Bölümlerden kazanılan altın; dükkânda joker alınır */
  coins: number;
  /** Son kazanılan bölümün altın ödülü (sonuç panelinde gösterilir) */
  coinsEarned: number | null;
  /** Dükkândan joker alır; altın yetmezse ya da üst sınırdaysa false. */
  buyPowerup(kind: PowerupKind): boolean;
  /** Son kazanılan güçlendirici; oyun ekranı kısa bir bildirim gösterir */
  earned: { id: number; gain: Partial<Inventory> } | null;
  /** Günün Tahtası sonuçları, tarih → sonuç (4.7, 4.8) */
  dailyHistory: Record<string, DailyResult>;
  /** Çevrimiçi durum (Faz 5): kapalı (yapılandırılmamış), bağlanıyor, çevrimiçi, çevrimdışı */
  online: { status: 'off' | 'connecting' | 'online' | 'offline'; profile: Profile | null };
  /** Oynatılan hamle animasyonu; bitince null olur. */
  timeline: ActiveTimeline | null;
  /** Temizleme animasyonu sürerken giriş kilitlidir. */
  locked: boolean;
  init(): Promise<void>;
  start(mode: PlayMode): void;
  startTutorial(next: TutorialNext): void;
  startLevel(id: number): void;
  /** Bugünün tahtasını başlatır; bugün zaten oynandıysa false (günde tek deneme). */
  startDaily(): boolean;
  /** Joker kullanır; çekiç ve döndür için hedef hücre gerekir. Kullanılamazsa false. */
  activatePowerup(kind: PowerupKind, r?: number, c?: number): boolean;
  /** Anonim giriş yapar ve bekleyen sonuçları gönderir (5.1, 5.5) */
  connectOnline(): Promise<void>;
  /** Bekleyen Günün Tahtası sonuçlarını gönderir (5.5) */
  syncDaily(): Promise<void>;
  saveNickname(raw: string): Promise<'ok' | 'invalid' | 'offline'>;
  addFriendCode(code: string): Promise<AddFriendResult>;
  /** Öğreticiyi bitirir (ya da geçer) ve seçilen moda geçer. */
  finishTutorial(): void;
  /** Geçerli hamlede true döner. */
  drop(trayIndex: number, row: number, col: number): boolean;
  updateSettings(patch: Partial<Settings>): void;
  /** Yalnızca geliştirme: tahtayı renk görme türüyle önizler (3.2.2). Saklanmaz. */
  visionPreview: Vision;
  setVisionPreview(v: Vision): void;
  /** Yalnızca geliştirme: FPS göstergesi (3.8.1). Saklanmaz. */
  showFps: boolean;
  setShowFps(on: boolean): void;
}

export function todayKey(date = new Date()): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

function seedFor(mode: PlayMode): number {
  // Günün tohumu sunucudaki doğrulamayla aynı kaynaktan (5.4).
  return mode === 'daily' ? dailySeed(todayKey()) : (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0;
}

/** Ayarları ses ve titreşim katmanına uygular. */
function applyOutputs(s: Settings) {
  setSoundEnabled(s.sound);
  setMusicEnabled(s.music);
  setHapticsEnabled(s.haptics);
}

let timelineId = 0;
/** Bölüm başına son kullanılan tohum (aynı bölüm art arda aynı parçalarla gelmesin) */
const lastLevelSeed = new Map<number, number>();
const timers: ReturnType<typeof setTimeout>[] = [];
const clearTimers = () => timers.splice(0).forEach(clearTimeout);

export const useGameStore = create<GameStore>((set, get) => ({
  mode: 'endless',
  game: newGame(seedFor('endless')),
  best: 0,
  bestAtStart: 0,
  settings: DEFAULT_SETTINGS,
  tutorialDone: true,
  tutorial: null,
  ready: false,
  onboarded: true,
  level: null,
  levelEnd: null,
  levelStarsBefore: 0,
  progress: EMPTY_PROGRESS,
  powerups: EMPTY_INVENTORY,
  coins: START_COINS,
  coinsEarned: null,
  earned: null,
  dailyHistory: {},
  online: { status: onlineConfigured ? 'connecting' : 'off', profile: null },
  timeline: null,
  locked: false,
  visionPreview: 'normal',
  setVisionPreview: (visionPreview) => set({ visionPreview }),
  showFps: false,
  setShowFps: (showFps) => set({ showFps }),

  async init() {
    const [best, saved, tutorialDone, onboardedSaved, progress, powerups, dailyHistory, coins] = await Promise.all([
      loadBest(),
      loadSettings(),
      loadTutorialDone(),
      loadOnboarded(),
      loadProgress(),
      loadPowerups(),
      loadDailyHistory(),
      loadCoins(START_COINS),
    ]);
    // Kayıtlı ayar yoksa işletim sisteminin "hareketi azalt" tercihine uy.
    const systemReduce = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
    const settings: Settings = { ...DEFAULT_SETTINGS, reduceMotion: systemReduce, ...saved };
    set((s) => ({ best: Math.max(best, s.best), bestAtStart: Math.max(best, s.bestAtStart), settings, tutorialDone, progress, powerups, dailyHistory, coins,
      // Öğreticiyi bitirmiş eski oyuncu tanıtımı görmez.
      onboarded: onboardedSaved || tutorialDone, ready: true }));
    setHapticsEnabled(settings.haptics);
    await initAudio(settings);
    // Çevrimiçi bağlantı oyunu bekletmez.
    void get().connectOnline();
  },

  async connectOnline() {
    if (!onlineConfigured) {
      set({ online: { status: 'off', profile: null } });
      return;
    }
    set((s) => ({ online: { ...s.online, status: 'connecting' } }));
    const profile = await connect();
    set({ online: { status: profile ? 'online' : 'offline', profile } });
    if (profile) await get().syncDaily();
  },

  async syncDaily() {
    if (get().online.status !== 'online') return;
    const res = await flushDaily(get().dailyHistory, todayKey(), submitDaily);
    if (!res.changed) return;
    // Gönderim sürerken yeni hamle kaydedilmiş olabilir: yalnız gönderildi bayrağını birleştir.
    const merged = { ...get().dailyHistory };
    for (const [date, r] of Object.entries(res.history)) {
      if (r.submitted && merged[date]) merged[date] = { ...merged[date], submitted: true };
    }
    set({ dailyHistory: merged });
    void saveDailyHistory(merged);
  },

  async saveNickname(raw) {
    const profile = get().online.profile;
    const name = cleanNickname(raw);
    if (name === undefined) return 'invalid';
    if (!profile) return 'offline';
    if (!(await setNickname(profile.id, name))) return 'offline';
    set((s) => ({ online: { ...s.online, profile: { ...profile, nickname: name } } }));
    return 'ok';
  },

  async addFriendCode(code) {
    if (get().online.status !== 'online') return 'offline';
    return addFriend(code);
  },

  start(mode) {
    clearTimers();
    set({
      mode,
      game: newGame(seedFor(mode)),
      bestAtStart: get().best,
      tutorial: null,
      level: null,
      levelEnd: null,
      timeline: null,
      locked: false,
    });
  },

  startLevel(id) {
    const base = getLevel(id);
    if (!base) return;
    clearTimers();
    // Her denemede havuzdan farklı bir tohum: parçalar değişir, bölüm yine geçilebilir kalır.
    const seed = pickLevelSeed(base, lastLevelSeed.get(id) ?? null);
    lastLevelSeed.set(id, seed);
    const level = { ...base, seed };
    set({
      mode: 'level',
      game: levelState(level),
      level,
      levelEnd: null,
      levelStarsBefore: get().progress.stars[id] ?? 0,
      coinsEarned: null,
      tutorial: null,
      timeline: null,
      locked: false,
    });
  },

  startDaily() {
    const today = todayKey();
    if (get().dailyHistory[today]) return false;
    get().start('daily');
    // Deneme oyun başladığı anda harcanır: yarıda bırakılsa da günün sonucu sayılır.
    recordDaily(get().game, false, []);
    return true;
  },

  buyPowerup(kind) {
    const { powerups, coins } = get();
    const res = buyPowerup(powerups, coins, kind);
    if (!res) return false;
    set({ powerups: res.inventory, coins: res.coins });
    void savePowerups(res.inventory);
    void saveCoins(res.coins);
    return true;
  },

  activatePowerup(kind, r, c) {
    const { game, mode, powerups, locked, levelEnd, level } = get();
    // Günün Tahtası'nda herkes eşit koşulda oynar; öğreticide gerek yok.
    // Yer kalmadığı için kaybedilen bölüm kilitli kalır ama jokerle kurtarılabilir.
    const stuck = levelEnd?.status === 'lost' && levelEnd.reason === 'stuck';
    if (mode === 'daily' || mode === 'tutorial' || powerups[kind] <= 0) return false;
    if ((locked && !stuck) || (levelEnd && !stuck)) return false;
    const hasCell = r !== undefined && c !== undefined;
    let res: PowerupResult | null = null;
    if (kind === 'hammer') res = hasCell ? applyHammer(game, r, c) : null;
    else if (kind === 'rotate') res = hasCell ? applyRotate(game, r, c) : null;
    else if (kind === 'lightning') res = applyLightning(game);
    else res = applyShuffle(game);
    if (!res) return false;
    const inventory = { ...powerups, [kind]: powerups[kind] - 1 };
    void savePowerups(inventory);
    const tl = buildTimeline(res.placed ?? game.board, res.state.board, res.events);
    const id = ++timelineId;
    clearTimers();

    // Joker bölüm hedefini tutturabilir (Döndür lamba yakar, Yıldırım kilitleri kırar): bölüm kazanılır.
    // Yer kalmadığı için kaybedilen bölüm, joker yer açarsa kurtulur.
    let endNow = levelEnd;
    let endLater: Exclude<Outcome, { status: 'playing' }> | null = null;
    if (mode === 'level' && level) {
      const outcome = levelOutcome(level, res.state);
      if (outcome.status === 'won') {
        recordLevelWin(level.id, outcome.stars, outcome.score);
        endNow = null;
        endLater = outcome;
      } else if (outcome.status === 'playing') endNow = null;
      else endNow = outcome;
    }
    const newBest = mode === 'endless' ? Math.max(get().best, res.state.score) : get().best;
    if (newBest > get().best) void saveBest(newBest);
    set({
      game: res.state,
      best: newBest,
      powerups: inventory,
      levelEnd: endNow,
      timeline: { id, tl, scoreBefore: game.score },
      locked: tl.lockUntil > 0 || endLater !== null,
    });
    if (tl.lockUntil > 0 && !endLater) {
      timers.push(setTimeout(() => get().timeline?.id === id && set({ locked: false }), tl.lockUntil));
    }
    timers.push(setTimeout(() => {
      if (get().timeline?.id !== id) return;
      set({ timeline: null });
      if (endLater) set({ levelEnd: endLater });
    }, tl.duration));
    return true;
  },

  startTutorial(next) {
    clearTimers();
    set({
      mode: 'tutorial',
      game: tutorialState(0),
      tutorial: { step: 0, next, finished: false },
      level: null,
      levelEnd: null,
      timeline: null,
      locked: false,
    });
  },

  finishOnboarding() {
    if (get().onboarded) return;
    void saveOnboarded();
    set({ onboarded: true });
  },

  finishTutorial() {
    const next = get().tutorial?.next ?? 'endless';
    if (!get().tutorialDone) {
      void saveTutorialDone();
      // Öğreticiyi bitiren, güçlendiricileri tanısın diye birer tane kazanır.
      grantPowerups({ hammer: 1, shuffle: 1 });
    }
    set({ tutorialDone: true });
    if (next === 'adventure') get().startLevel(nextLevel(get().progress.stars));
    // Günün Tahtası tek deneme kaydıyla başlar; bugün zaten oynandıysa sonsuz moda geçilir.
    else if (next === 'daily') {
      if (!get().startDaily()) get().start('endless');
    } else get().start(next);
  },

  drop(trayIndex, row, col) {
    const { game, locked, best, mode, tutorial, level, levelEnd } = get();
    if (locked || tutorial?.finished || levelEnd) return false;
    const piece = game.tray[trayIndex];
    const res = applyMove(game, trayIndex, row, col);
    if (!res || !piece) return false;

    const isTutorial = mode === 'tutorial' && tutorial !== null;
    let next = res.state;
    if (isTutorial) {
      // Öğreticide rastgele yeni tepsi gelmez; adım kendi parçalarıyla biter.
      const refilled = res.events.some((e) => e.type === 'TRAY_REFILL');
      if (refilled) next = { ...next, tray: [null, null, null], over: false };
    }

    // Oyun durumu hemen ilerler; tahta zaman çizelgesi bitene kadar animasyonlu sahneyi gösterir.
    const tl = buildTimeline(place(game.board, piece, row, col), next.board, res.events);
    const id = ++timelineId;
    clearTimers();
    // Bölüm sonucu: hedef tuttu ya da hamle/yer bitti. Sonuç, animasyon bitince açıklanır.
    const outcome = mode === 'level' && level ? levelOutcome(level, next) : null;
    const ended = outcome !== null && outcome.status !== 'playing';
    if (ended && outcome.status === 'won' && level) recordLevelWin(level.id, outcome.stars, outcome.score);

    // Güçlendiriciler oynayarak kazanılır (4.10): Süper Devre/Çifte Işık → Çekiç; 3 yıldız ya da günlük → Karıştır.
    if (!isTutorial) {
      const gain = { ...earnedFromMove(res.events) };
      if (ended && outcome.status === 'won' && outcome.stars === 3) gain.shuffle = (gain.shuffle ?? 0) + 1;
      if (mode === 'daily' && next.over) gain.shuffle = (gain.shuffle ?? 0) + 1;
      grantPowerups(gain);
    }
    if (mode === 'daily') {
      const prev = get().dailyHistory[todayKey()]?.moves ?? [];
      recordDaily(next, next.over, [...prev, { i: trayIndex, r: row, c: col }]);
      // Oyun bittiyse sonuç hemen gönderilir; çevrimdışıysa kuyrukta bekler (5.5).
      if (next.over) void get().syncDaily();
    }

    // Öğretici ve bölüm puanı sonsuz modun en iyi puanına sayılmaz.
    const newBest = isTutorial || mode === 'level' ? best : Math.max(best, next.score);
    if (newBest > best) void saveBest(newBest);
    set({
      game: next,
      best: newBest,
      timeline: { id, tl, scoreBefore: game.score },
      locked: tl.lockUntil > 0 || ended,
    });
    if (tl.lockUntil > 0 && !ended) {
      timers.push(setTimeout(() => get().timeline?.id === id && set({ locked: false }), tl.lockUntil));
    }
    timers.push(
      setTimeout(() => {
        if (get().timeline?.id !== id) return;
        set({ timeline: null });
        if (isTutorial) advanceTutorial(tl.current !== null);
        if (outcome && outcome.status !== 'playing') set({ levelEnd: outcome });
      }, tl.duration),
    );
    return true;
  },

  updateSettings(patch) {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    applyOutputs(settings);
    void saveSettings(settings);
  },
}));

let earnedId = 0;
/** Envantere ekler, saklar ve oyun ekranına bildirir. */
function grantPowerups(gain: Partial<Inventory>) {
  if (!gain.hammer && !gain.shuffle) return;
  const { powerups } = useGameStore.getState();
  const next = addPowerups(powerups, gain);
  useGameStore.setState({ powerups: next, earned: { id: ++earnedId, gain } });
  void savePowerups(next);
}

/** Bugünün Günün Tahtası sonucunu kaydeder (her hamlede güncellenir; uygulama kapanırsa son hâli geçerli). */
function recordDaily(game: GameState, finished: boolean, moves: DailyMove[]) {
  const date = todayKey();
  const { dailyHistory } = useGameStore.getState();
  const entry: DailyResult = {
    date,
    score: game.score,
    circuits: game.circuits,
    longest: game.longestCircuit,
    finished,
    board: encodeBoard(game.board),
    moves,
    submitted: false,
  };
  const next = { ...dailyHistory, [date]: entry };
  useGameStore.setState({ dailyHistory: next });
  void saveDailyHistory(next);
}

/** Kazanılan bölümün en iyi yıldızını ve puanını saklar (4.5). */
function recordLevelWin(id: number, stars: number, score: number) {
  const { progress, coins } = useGameStore.getState();
  // Altın: ilk geçişte yıldıza göre, tekrar oynamada az (yeni yıldız ayrıca ödüllenir).
  const earned = levelCoins(progress.stars[id] ?? 0, stars);
  useGameStore.setState({ coins: coins + earned, coinsEarned: earned });
  void saveCoins(coins + earned);
  const next: Progress = {
    stars: { ...progress.stars, [id]: Math.max(progress.stars[id] ?? 0, stars) },
    scores: { ...progress.scores, [id]: Math.max(progress.scores[id] ?? 0, score) },
  };
  useGameStore.setState({ progress: next });
  void saveProgress(next);
}

/** Hamle animasyonu bitince: devre tamamlandıysa sonraki adım, doğru hamle kalmadıysa adım baştan. */
function advanceTutorial(completedCircuit: boolean) {
  const { tutorial, game } = useGameStore.getState();
  if (!tutorial) return;
  if (completedCircuit) {
    const step = tutorial.step + 1;
    if (step >= TUTORIAL_STEPS.length) {
      useGameStore.setState({ tutorial: { ...tutorial, finished: true } });
    } else {
      useGameStore.setState({ tutorial: { ...tutorial, step }, game: tutorialState(step) });
    }
    return;
  }
  // Doğru hamle artık yapılamıyorsa (ör. yanıltıcı parça hedefi kapattı) adım yeniden kurulur.
  if (nextHint(tutorial.step, game) === null) {
    useGameStore.setState({ game: tutorialState(tutorial.step) });
  }
}
