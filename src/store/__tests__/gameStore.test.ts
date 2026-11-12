// Oyun durumu kuralları: Günün Tahtası tek deneme (4.7), güçlendiriciler (4.10), bölümde kurtarma.
import { idx } from '../../game/board';
import { validPlacements } from '../../game/placement';
import { EMPTY_INVENTORY, PRICES, START_COINS, levelCoins } from '../../game/powerups';
import { E, W } from '../../game/types';
import { boardWithTerminals } from '../../game/__tests__/helpers';
import { replayDaily } from '../../online/verify';
import { useGameStore, todayKey } from '../gameStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock fabrikası içinde import kullanılamaz
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../audio/sound', () => ({
  initAudio: jest.fn(),
  setSoundEnabled: jest.fn(),
  setMusicEnabled: jest.fn(),
  playSfx: jest.fn(),
  playNote: jest.fn(),
}));
jest.mock('../../online/api', () => ({
  onlineConfigured: false,
  connect: jest.fn(async () => null),
  submitDaily: jest.fn(async () => 'retry'),
  setNickname: jest.fn(),
  addFriend: jest.fn(),
  cleanNickname: jest.requireActual('../../online/api').cleanNickname,
}));
jest.mock('../../audio/haptics', () => ({ haptic: jest.fn(), setHapticsEnabled: jest.fn() }));

const reset = () =>
  useGameStore.setState({ dailyHistory: {}, powerups: { ...EMPTY_INVENTORY, hammer: 0, shuffle: 0 }, earned: null, locked: false, timeline: null });

beforeEach(() => {
  jest.useFakeTimers();
  reset();
});
afterEach(() => jest.useRealTimers());

describe('Günün Tahtası', () => {
  it('günde tek deneme: ikinci kez başlatılamaz, deneme başlar başlamaz kaydedilir', () => {
    const s = useGameStore.getState();
    expect(s.startDaily()).toBe(true);
    expect(useGameStore.getState().mode).toBe('daily');
    const today = useGameStore.getState().dailyHistory[todayKey()];
    expect(today).toMatchObject({ score: 0, finished: false });
    expect(today.board).toHaveLength(64);
    expect(useGameStore.getState().startDaily()).toBe(false);
  });

  it('herkes aynı tahtayı alır (tarih tohumu)', () => {
    useGameStore.getState().startDaily();
    const a = useGameStore.getState().game.tray;
    reset();
    useGameStore.getState().startDaily();
    expect(useGameStore.getState().game.tray).toEqual(a);
  });

  it('kaydedilen hamleler sunucu doğrulamasında ekrandaki puanı birebir verir', () => {
    useGameStore.getState().startDaily();
    for (let k = 0; k < 25 && !useGameStore.getState().game.over; k++) {
      const g = useGameStore.getState().game;
      const i = g.tray.findIndex((p) => p && validPlacements(g.board, p).length > 0);
      const { r, c } = validPlacements(g.board, g.tray[i]!)[k % 3] ?? validPlacements(g.board, g.tray[i]!)[0];
      useGameStore.setState({ locked: false });
      expect(useGameStore.getState().drop(i, r, c)).toBe(true);
    }
    const g = useGameStore.getState().game;
    const entry = useGameStore.getState().dailyHistory[todayKey()];
    expect(entry.moves).toHaveLength(g.moves);
    expect(replayDaily(todayKey(), entry.moves!)).toMatchObject({ ok: true, score: g.score, circuits: g.circuits });
    expect(entry.score).toBe(g.score);
  });

  it('günlükte güçlendirici kullanılamaz', () => {
    useGameStore.setState({ powerups: { ...EMPTY_INVENTORY, hammer: 3, shuffle: 3 } });
    useGameStore.getState().startDaily();
    expect(useGameStore.getState().activatePowerup('shuffle')).toBe(false);
    expect(useGameStore.getState().powerups.shuffle).toBe(3);
  });
});

describe('güçlendiriciler', () => {
  it('karıştır bir adet harcar, tepsiyi değiştirir; envanter yoksa çalışmaz', () => {
    useGameStore.getState().start('endless');
    expect(useGameStore.getState().activatePowerup('shuffle')).toBe(false);
    useGameStore.setState({ powerups: { ...EMPTY_INVENTORY, hammer: 0, shuffle: 2 } });
    const before = useGameStore.getState().game.tray;
    expect(useGameStore.getState().activatePowerup('shuffle')).toBe(true);
    expect(useGameStore.getState().powerups.shuffle).toBe(1);
    expect(useGameStore.getState().game.tray).not.toEqual(before);
  });

  it('çekiç hedef hücre ister ve yalnız sıradan bloğu kırar', () => {
    useGameStore.getState().start('endless');
    useGameStore.setState({ powerups: { ...EMPTY_INVENTORY, hammer: 1, shuffle: 0 } });
    const g = useGameStore.getState().game;
    const empty = g.board.findIndex((c) => c.kind === 'empty');
    expect(useGameStore.getState().activatePowerup('hammer')).toBe(false);
    expect(useGameStore.getState().activatePowerup('hammer', Math.floor(empty / 8), empty % 8)).toBe(false);
    const board = g.board.slice();
    board[idx(4, 4)] = { kind: 'block', wires: 0, color: 'pink' };
    useGameStore.setState({ game: { ...g, board } });
    expect(useGameStore.getState().activatePowerup('hammer', 4, 4)).toBe(true);
    expect(useGameStore.getState().game.board[idx(4, 4)].kind).toBe('empty');
    expect(useGameStore.getState().powerups.hammer).toBe(0);
  });

  it('yer kalmadığı için kaybedilen bölüm karıştırla kurtarılır', () => {
    useGameStore.getState().startLevel(1);
    const g = useGameStore.getState().game;
    useGameStore.setState({
      powerups: { ...EMPTY_INVENTORY, hammer: 0, shuffle: 1 },
      levelEnd: { status: 'lost', reason: 'stuck' },
      locked: true,
      game: { ...g, over: true },
    });
    expect(useGameStore.getState().activatePowerup('shuffle')).toBe(true);
    expect(useGameStore.getState().levelEnd).toBeNull();
  });

  it('hamle bittiği için kaybedilen bölüm kurtarılamaz', () => {
    useGameStore.getState().startLevel(1);
    useGameStore.setState({ powerups: { ...EMPTY_INVENTORY, hammer: 0, shuffle: 1 }, levelEnd: { status: 'lost', reason: 'moves' }, locked: true });
    expect(useGameStore.getState().activatePowerup('shuffle')).toBe(false);
  });
});

describe('altın ve yeni jokerler', () => {
  it('dükkân: altın yeterse joker alınır ve altın düşer; yetmezse alınmaz', () => {
    useGameStore.setState({ coins: START_COINS, powerups: EMPTY_INVENTORY });
    expect(useGameStore.getState().buyPowerup('shuffle')).toBe(true);
    expect(useGameStore.getState().coins).toBe(START_COINS - PRICES.shuffle);
    expect(useGameStore.getState().powerups.shuffle).toBe(1);
    expect(useGameStore.getState().buyPowerup('lightning')).toBe(false);
    expect(useGameStore.getState().coins).toBe(START_COINS - PRICES.shuffle);
  });

  it('döndür devreyi tamamlar: lamba yanar, puan gelir, hamle sayılmaz', () => {
    useGameStore.getState().start('endless');
    const g = useGameStore.getState().game;
    const board = boardWithTerminals();
    for (let c = 1; c <= 6; c++) board[idx(3, c)] = { kind: 'block', wires: c === 3 ? 1 | 4 : E | W, color: 'pink' };
    useGameStore.setState({ game: { ...g, board, score: 0, circuits: 0 }, powerups: { ...EMPTY_INVENTORY, rotate: 1 } });
    expect(useGameStore.getState().activatePowerup('rotate', 3, 3)).toBe(true);
    const after = useGameStore.getState().game;
    expect(after.circuits).toBe(1);
    expect(after.score).toBeGreaterThan(0);
    expect(after.moves).toBe(g.moves);
    expect(useGameStore.getState().powerups.rotate).toBe(0);
  });

  it('yıldırım kilitli blokları kırınca kilit bölümü kazanılır ve altın verilir', () => {
    useGameStore.setState({ coins: 0, progress: { stars: {}, scores: {} }, powerups: { ...EMPTY_INVENTORY, lightning: 1 } });
    useGameStore.getState().startLevel(11);
    expect(useGameStore.getState().activatePowerup('lightning')).toBe(true);
    expect(useGameStore.getState().game.board.some((c) => c.kind === 'block')).toBe(false);
    jest.runAllTimers();
    const s = useGameStore.getState();
    expect(s.levelEnd?.status).toBe('won');
    const stars = s.levelEnd?.status === 'won' ? s.levelEnd.stars : 0;
    expect(s.coins).toBe(levelCoins(0, stars));
    expect(s.coinsEarned).toBe(levelCoins(0, stars));
    expect(s.progress.stars[11]).toBe(stars);
  });
});

describe('bölüm denemeleri', () => {
  it('aynı bölüm art arda açılınca farklı tohum ve farklı parçalarla gelir', () => {
    useGameStore.getState().startLevel(5);
    const a = useGameStore.getState().game;
    useGameStore.getState().startLevel(5);
    const b = useGameStore.getState().game;
    expect(b.seed).not.toBe(a.seed);
    expect(b.tray).not.toEqual(a.tray);
    expect(useGameStore.getState().level?.seeds).toContain(b.seed);
  });
});

describe('İlk açılış tanıtımı', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- taklit modülün kendisine erişim
  const storage = require('@react-native-async-storage/async-storage');
  beforeEach(async () => {
    jest.useRealTimers();
    await storage.clear();
    useGameStore.setState({ ready: false, onboarded: true, tutorialDone: true });
  });

  it('ilk açılışta gösterilir; geçilince kaydedilir ve bir daha gösterilmez', async () => {
    await useGameStore.getState().init();
    expect(useGameStore.getState().ready).toBe(true);
    expect(useGameStore.getState().onboarded).toBe(false);
    useGameStore.getState().finishOnboarding();
    expect(useGameStore.getState().onboarded).toBe(true);
    useGameStore.setState({ onboarded: false });
    await useGameStore.getState().init();
    expect(useGameStore.getState().onboarded).toBe(true);
  });

  it('öğreticiyi bitirmiş eski oyuncuya gösterilmez', async () => {
    await storage.setItem('devre.tutorialDone', '1');
    await useGameStore.getState().init();
    expect(useGameStore.getState().onboarded).toBe(true);
  });
});
