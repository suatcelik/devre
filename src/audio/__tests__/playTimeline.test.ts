import { buildTimeline } from '../../anim/timeline';
import { applyMove, newGame } from '../../game/engine';
import { place } from '../../game/placement';
import { E, GameState, W } from '../../game/types';
import { boardWithTerminals, piece, setBlock } from '../../game/__tests__/helpers';
import { haptic } from '../haptics';
import { playTimeline } from '../playTimeline';
import { playNote, playSfx } from '../sound';

jest.mock('../sound', () => ({ playSfx: jest.fn(), playNote: jest.fn() }));
jest.mock('../haptics', () => ({ haptic: jest.fn() }));

const sfx = playSfx as jest.Mock;
const note = playNote as jest.Mock;
const buzz = haptic as jest.Mock;

/** Pil (3,0) → 6 düz blok → lamba (3,7); son blok (3,6) bırakılınca devre tamamlanır. */
function circuitTimeline() {
  const board = boardWithTerminals();
  for (let c = 1; c <= 5; c++) setBlock(board, 3, c, E | W);
  const state: GameState = { ...newGame(1), board, tray: [piece([{ r: 0, c: 0, wires: E | W }]), null, null] };
  const res = applyMove(state, 0, 3, 6)!;
  return buildTimeline(place(state.board, state.tray[0]!, 3, 6), res.state.board, res.events);
}

beforeEach(() => {
  jest.useFakeTimers();
  sfx.mockClear();
  note.mockClear();
  buzz.mockClear();
});
afterEach(() => jest.useRealTimers());

describe('ses zamanlaması', () => {
  it('yerleştirme sesi ve hafif titreşim hemen çalar', () => {
    playTimeline(circuitTimeline());
    expect(sfx).toHaveBeenCalledWith('place');
    expect(buzz).toHaveBeenCalledWith('place');
  });

  it('akım boyunca her hücrede yükselen bir nota, sonra lamba çanı ve orta titreşim', () => {
    const tl = circuitTimeline();
    playTimeline(tl);
    jest.advanceTimersByTime(tl.lamp!.at - 1);
    expect(sfx).not.toHaveBeenCalledWith('lamp');
    jest.advanceTimersByTime(1);
    expect(note.mock.calls.map((c) => c[0])).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(sfx).toHaveBeenCalledWith('lamp');
    expect(buzz).toHaveBeenCalledWith('circuit');
  });

  it('pop sesleri seyreltilir, övgüde jingle çalar', () => {
    const tl = circuitTimeline();
    playTimeline(tl);
    jest.advanceTimersByTime(tl.duration);
    const pops = sfx.mock.calls.filter((c) => c[0] === 'pop').length;
    expect(pops).toBeGreaterThan(0);
    expect(pops).toBeLessThan(tl.bursts.length);
    expect(sfx).toHaveBeenCalledWith('jingle');
  });

  it('iptal edilince bekleyen sesler çalmaz', () => {
    const tl = circuitTimeline();
    const cancel = playTimeline(tl);
    cancel();
    jest.advanceTimersByTime(tl.duration);
    expect(note).not.toHaveBeenCalled();
    expect(sfx).toHaveBeenCalledTimes(1); // yalnızca hemen çalan yerleştirme sesi
  });
});
