// OTOMATİK ÜRETİLDİ: scripts/build-functions.mjs. Elle düzenlemeyin; src/game ve src/online/verify.ts kaynaktır.

// src/game/types.ts
var BOARD_SIZE = 8;
var TRAY_SIZE = 3;
var N = 1;
var E = 2;
var S = 4;
var W = 8;
var DIRS = [N, E, S, W];

// src/game/board.ts
var EMPTY = { kind: "empty" };
var idx = (r, c) => r * BOARD_SIZE + c;
var inBounds = (r, c) => r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
function emptyBoard() {
  return Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => EMPTY);
}
function cellAt(board, r, c) {
  return board[idx(r, c)];
}
function opposite(d) {
  return (d << 2 | d >> 2) & 15;
}
function step(r, c, d) {
  switch (d) {
    case N:
      return { r: r - 1, c };
    case S:
      return { r: r + 1, c };
    case E:
      return { r, c: c + 1 };
    default:
      return { r, c: c - 1 };
  }
}
function rotateCW(mask) {
  return (mask << 1 | mask >> 3) & 15;
}
function wiresOf(cell) {
  return cell.kind === "empty" ? 0 : cell.wires;
}
function bitCount(mask) {
  let n = 0;
  for (let m = mask; m; m &= m - 1) n++;
  return n;
}
function findKind(board, kind) {
  const i = board.findIndex((cell) => cell.kind === kind);
  return i < 0 ? null : { r: Math.floor(i / BOARD_SIZE), c: i % BOARD_SIZE };
}
function inwardDir(r, c) {
  const last = BOARD_SIZE - 1;
  const corner = (r === 0 || r === last) && (c === 0 || c === last);
  if (corner) return null;
  if (c === 0) return E;
  if (c === last) return W;
  if (r === 0) return S;
  if (r === last) return N;
  return null;
}
function edgeSlots() {
  const out = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (inwardDir(r, c) !== null) out.push({ r, c });
    }
  }
  return out;
}

// src/game/circuit.ts
function connectedNeighbors(board, r, c) {
  const wires = wiresOf(cellAt(board, r, c));
  const out = [];
  for (const d of DIRS) {
    if (!(wires & d)) continue;
    const p = step(r, c, d);
    if (!inBounds(p.r, p.c)) continue;
    if (wiresOf(cellAt(board, p.r, p.c)) & opposite(d)) out.push(p);
  }
  return out;
}
function findCircuit(board) {
  return findCircuits(board)[0] ?? null;
}
function findCircuits(board) {
  const start = findKind(board, "battery");
  if (!start) return [];
  const prev = new Int16Array(BOARD_SIZE * BOARD_SIZE).fill(-1);
  const startIdx = idx(start.r, start.c);
  prev[startIdx] = startIdx;
  const queue = [start];
  const lamps = [];
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head];
    if (cellAt(board, cur.r, cur.c).kind === "lamp") {
      lamps.push(cur);
      continue;
    }
    for (const n of connectedNeighbors(board, cur.r, cur.c)) {
      const ni = idx(n.r, n.c);
      if (prev[ni] !== -1) continue;
      const kind = cellAt(board, n.r, n.c).kind;
      if (kind !== "block" && kind !== "switch" && kind !== "lamp") continue;
      prev[ni] = idx(cur.r, cur.c);
      queue.push(n);
    }
  }
  return lamps.map((lamp) => {
    const path = [];
    let i = idx(lamp.r, lamp.c);
    while (i !== startIdx) {
      path.push({ r: Math.floor(i / BOARD_SIZE), c: i % BOARD_SIZE });
      i = prev[i];
    }
    path.push(start);
    return path.reverse();
  });
}
function circuitLength(board, path) {
  return path.filter((p) => {
    const kind = cellAt(board, p.r, p.c).kind;
    return kind === "block" || kind === "switch";
  }).length;
}

// src/game/pieces.ts
var SHAPES = [
  { id: "dot", color: "yellow", cells: [[0, 0]], weight: 2 },
  { id: "i2h", color: "pink", cells: [[0, 0], [0, 1]], weight: 3 },
  { id: "i2v", color: "pink", cells: [[0, 0], [1, 0]], weight: 3 },
  { id: "i3h", color: "blue", cells: [[0, 0], [0, 1], [0, 2]], weight: 3 },
  { id: "i3v", color: "blue", cells: [[0, 0], [1, 0], [2, 0]], weight: 3 },
  { id: "l3a", color: "green", cells: [[0, 0], [1, 0], [1, 1]], weight: 2 },
  { id: "l3b", color: "green", cells: [[0, 1], [1, 0], [1, 1]], weight: 2 },
  { id: "l3c", color: "green", cells: [[0, 0], [0, 1], [1, 0]], weight: 2 },
  { id: "l3d", color: "green", cells: [[0, 0], [0, 1], [1, 1]], weight: 2 },
  { id: "i4h", color: "purple", cells: [[0, 0], [0, 1], [0, 2], [0, 3]], weight: 1 },
  { id: "i4v", color: "purple", cells: [[0, 0], [1, 0], [2, 0], [3, 0]], weight: 1 },
  { id: "o4", color: "yellow", cells: [[0, 0], [0, 1], [1, 0], [1, 1]], weight: 1 },
  { id: "t4d", color: "orange", cells: [[0, 0], [0, 1], [0, 2], [1, 1]], weight: 1 },
  { id: "t4u", color: "orange", cells: [[0, 1], [1, 0], [1, 1], [1, 2]], weight: 1 },
  { id: "l4a", color: "orange", cells: [[0, 0], [1, 0], [2, 0], [2, 1]], weight: 1 },
  { id: "l4b", color: "orange", cells: [[0, 1], [1, 1], [2, 0], [2, 1]], weight: 1 },
  { id: "s4h", color: "pink", cells: [[0, 1], [0, 2], [1, 0], [1, 1]], weight: 1 },
  { id: "z4h", color: "pink", cells: [[0, 0], [0, 1], [1, 1], [1, 2]], weight: 1 }
];
var SHAPE_BY_ID = Object.fromEntries(
  SHAPES.map((s) => [s.id, s])
);
var INTERNAL_LINK = 0.75;
var EXTERNAL_END = 0.45;
var BLANK_CELL = 0.06;
function wireShape(shape, rng) {
  const key = (r, c) => `${r},${c}`;
  const cells = /* @__PURE__ */ new Map();
  for (const [r, c] of shape.cells) cells.set(key(r, c), { r, c, wires: 0 });
  const blanks = /* @__PURE__ */ new Set();
  if (shape.cells.length > 1 && rng.next() < BLANK_CELL * shape.cells.length) {
    blanks.add(rng.pick([...cells.keys()]));
  }
  const neighbor = (cell, d) => {
    const p = step(cell.r, cell.c, d);
    return cells.get(key(p.r, p.c));
  };
  for (const cell of cells.values()) {
    if (blanks.has(key(cell.r, cell.c))) continue;
    for (const d of DIRS) {
      const other = neighbor(cell, d);
      if (!other) {
        if (rng.next() < EXTERNAL_END) cell.wires |= d;
        continue;
      }
      if (d !== E && d !== S) continue;
      if (blanks.has(key(other.r, other.c))) continue;
      if (rng.next() < INTERNAL_LINK) {
        cell.wires |= d;
        other.wires |= opposite(d);
      }
    }
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const cell of cells.values()) {
      if (blanks.has(key(cell.r, cell.c))) continue;
      const count = bitCount(cell.wires);
      if (count >= 2) continue;
      const free = DIRS.filter((d2) => {
        if (cell.wires & d2) return false;
        const other2 = neighbor(cell, d2);
        return !other2 || !blanks.has(key(other2.r, other2.c));
      });
      const d = rng.pick(free);
      cell.wires |= d;
      const other = neighbor(cell, d);
      if (other) other.wires |= opposite(d);
      changed = true;
    }
  }
  return [...cells.values()];
}
function makePiece(shape, id, rng) {
  return { id, shapeId: shape.id, color: shape.color, cells: wireShape(shape, rng) };
}

// src/game/placement.ts
function canPlace(board, piece, row, col) {
  return piece.cells.every(({ r, c }) => {
    const rr = row + r;
    const cc = col + c;
    return inBounds(rr, cc) && cellAt(board, rr, cc).kind === "empty";
  });
}
function place(board, piece, row, col) {
  const next = board.slice();
  for (const { r, c, wires } of piece.cells) {
    next[idx(row + r, col + c)] = { kind: "block", wires, color: piece.color };
  }
  return next;
}
function placedCells(piece, row, col) {
  return piece.cells.map(({ r, c }) => ({ r: row + r, c: col + c }));
}
function fitsAnywhere(board, piece) {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (canPlace(board, piece, r, c)) return true;
    }
  }
  return false;
}
function isGameOver(board, tray) {
  const pieces = tray.filter((p) => p !== null);
  if (pieces.length === 0) return false;
  return !pieces.some((p) => fitsAnywhere(board, p));
}

// src/game/generator.ts
var CANDIDATES_PER_SLOT = 4;
var OPEN_END_BONUS = 3;
var MIN_TERMINAL_DISTANCE = 5;
function connectsToOpenEnd(board, piece) {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (!canPlace(board, piece, row, col)) continue;
      for (const { r, c, wires } of piece.cells) {
        for (const d of DIRS) {
          if (!(wires & d)) continue;
          const p = step(row + r, col + c, d);
          if (!inBounds(p.r, p.c)) continue;
          if (wiresOf(cellAt(board, p.r, p.c)) & opposite(d)) return true;
        }
      }
    }
  }
  return false;
}
function weightedShape(rng) {
  return SHAPES[rng.weighted(SHAPES.map((s) => s.weight))];
}
function generateTray(board, rng, firstId) {
  let id = firstId;
  const tray = [];
  for (let slot = 0; slot < TRAY_SIZE; slot++) {
    const candidates = [];
    for (let k = 0; k < CANDIDATES_PER_SLOT; k++) {
      candidates.push(makePiece(weightedShape(rng), id, rng));
    }
    const weights = candidates.map((p) => connectsToOpenEnd(board, p) ? OPEN_END_BONUS : 1);
    tray.push(candidates[rng.weighted(weights)]);
    id++;
  }
  if (!tray.some((p) => fitsAnywhere(board, p))) {
    const slot = rng.int(TRAY_SIZE);
    tray[slot] = makePiece(SHAPE_BY_ID.dot, tray[slot].id, rng);
  }
  return { tray, nextId: id };
}
var manhattan = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
var MIN_LAMP_SEPARATION = 3;
function placeTerminals(board, rng) {
  const lampCount = Math.max(1, board.filter((c) => c.kind === "lamp").length);
  return lampCount === 1 ? placeSingle(board, rng) : placeMany(board, rng, lampCount);
}
var withoutTerminals = (board) => board.map((cell) => cell.kind === "battery" || cell.kind === "lamp" ? EMPTY : cell);
function build(base, battery, lamps) {
  const next = base.slice();
  next[idx(battery.r, battery.c)] = { kind: "battery", wires: inwardDir(battery.r, battery.c) };
  for (const lamp of lamps) next[idx(lamp.r, lamp.c)] = { kind: "lamp", wires: inwardDir(lamp.r, lamp.c) };
  return next;
}
function placeSingle(board, rng) {
  const base = withoutTerminals(board);
  const slots = rng.shuffle(edgeSlots());
  const free = slots.filter((p) => base[idx(p.r, p.c)].kind === "empty");
  const result = (battery2, lamp2) => ({
    board: build(base, battery2, [lamp2]),
    battery: battery2,
    lamp: lamp2,
    lamps: [lamp2]
  });
  let fallback = null;
  for (const battery2 of free) {
    for (const lamp2 of free) {
      if (lamp2 === battery2 || manhattan(battery2, lamp2) < MIN_TERMINAL_DISTANCE) continue;
      const placed = result(battery2, lamp2);
      if (!findCircuit(placed.board)) return placed;
      fallback ??= placed;
    }
  }
  if (fallback) return fallback;
  const ordered = [...free, ...slots.filter((p) => !free.includes(p))];
  const battery = ordered[0];
  const lamp = ordered.find((p) => p !== battery && manhattan(p, battery) >= MIN_TERMINAL_DISTANCE) ?? ordered[1];
  return result(battery, lamp);
}
function placeMany(board, rng, count) {
  const base = withoutTerminals(board);
  const slots = rng.shuffle(edgeSlots());
  const free = slots.filter((p) => base[idx(p.r, p.c)].kind === "empty");
  const pickLamps = (battery2, pool) => {
    const lamps2 = [];
    for (const p of pool) {
      if (p === battery2 || manhattan(p, battery2) < MIN_TERMINAL_DISTANCE) continue;
      if (lamps2.some((l) => manhattan(l, p) < MIN_LAMP_SEPARATION)) continue;
      lamps2.push(p);
      if (lamps2.length === count) return lamps2;
    }
    return null;
  };
  let fallback = null;
  for (const battery2 of free) {
    for (let shift = 0; shift < free.length; shift += 3) {
      const lamps2 = pickLamps(battery2, [...free.slice(shift), ...free.slice(0, shift)]);
      if (!lamps2) break;
      const placed = { board: build(base, battery2, lamps2), battery: battery2, lamp: lamps2[0], lamps: lamps2 };
      if (findCircuits(placed.board).length === 0) return placed;
      fallback ??= placed;
    }
  }
  if (fallback) return fallback;
  const battery = free[0] ?? slots[0];
  const lamps = pickLamps(battery, slots) ?? slots.filter((p) => p !== battery).slice(0, count);
  return { board: build(base, battery, lamps), battery, lamp: lamps[0], lamps };
}

// src/game/rng.ts
function createRng(state) {
  let s = state >>> 0;
  const next = () => {
    s = s + 1831565813 >>> 0;
    let t = s;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const int = (n) => Math.floor(next() * n);
  return {
    next,
    int,
    pick: (items) => items[int(items.length)],
    shuffle: (items) => {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(i + 1);
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    weighted: (weights) => {
      const total = weights.reduce((a, b) => a + b, 0);
      let roll = next() * total;
      for (let i = 0; i < weights.length; i++) {
        roll -= weights[i];
        if (roll < 0) return i;
      }
      return weights.length - 1;
    },
    get state() {
      return s;
    }
  };
}
function seedFromString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// src/game/engine.ts
var CIRCUIT_POINTS = 10;
var LINE_CELL_POINTS = 10;
var DOUBLE_LAMP_MULTIPLIER = 2;
function circuitScore(length, combo) {
  return length * length * CIRCUIT_POINTS * Math.max(1, combo);
}
function newGame(seed) {
  const rng = createRng(seed);
  const { board } = placeTerminals(emptyBoard(), rng);
  const { tray, nextId } = generateTray(board, rng, 1);
  return {
    board,
    tray,
    score: 0,
    combo: 0,
    moves: 0,
    circuits: 0,
    longestCircuit: 0,
    seed,
    rngState: rng.state,
    nextPieceId: nextId,
    over: false
  };
}
function findFullLines(board) {
  const rows = [];
  const cols = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    let rowFull = true;
    let colFull = true;
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (cellAt(board, i, j).kind === "empty") rowFull = false;
      if (cellAt(board, j, i).kind === "empty") colFull = false;
    }
    if (rowFull) rows.push(i);
    if (colFull) cols.push(i);
  }
  return { rows, cols };
}
function resolve(board, combo, score, rngState) {
  const rng = createRng(rngState);
  const events = [];
  let next = board.slice();
  let total = score;
  let length = 0;
  const paths = findCircuits(next);
  const path = paths[0] ?? null;
  if (paths.length) {
    combo += 1;
    const double = paths.length > 1;
    const lengths = paths.map((p) => circuitLength(next, p));
    length = Math.max(...lengths);
    let amount = lengths.reduce((sum, len) => sum + circuitScore(len, combo), 0);
    if (double) amount *= DOUBLE_LAMP_MULTIPLIER;
    for (const p of paths.flat()) {
      if (cellAt(next, p.r, p.c).kind === "block") next[idx(p.r, p.c)] = EMPTY;
    }
    total += amount;
    paths.forEach((p, i) => events.push({ type: "CIRCUIT_COMPLETE", path: p, length: lengths[i], combo, double }));
    events.push({ type: "SCORE", amount, reason: "circuit", total });
  } else {
    combo = 0;
  }
  const { rows, cols } = findFullLines(next);
  const cleared = [];
  if (rows.length || cols.length) {
    const seen = /* @__PURE__ */ new Set();
    const clear = (r, c) => {
      const i = idx(r, c);
      const cell = next[i];
      if (seen.has(i) || cell.kind !== "block" || cell.locked) return;
      seen.add(i);
      cleared.push({ r, c });
      next[i] = EMPTY;
    };
    for (const r of rows) for (let c = 0; c < BOARD_SIZE; c++) clear(r, c);
    for (const c of cols) for (let r = 0; r < BOARD_SIZE; r++) clear(r, c);
  }
  if (cleared.length) {
    const amount = cleared.length * LINE_CELL_POINTS;
    total += amount;
    events.push({ type: "LINE_CLEAR", rows, cols, cells: cleared });
    events.push({ type: "SCORE", amount, reason: "line", total });
  }
  if (path) {
    const moved = placeTerminals(next, rng);
    next = moved.board;
    events.push({ type: "TERMINALS_MOVED", battery: moved.battery, lamp: moved.lamp, lamps: moved.lamps });
  }
  return {
    board: next,
    events,
    scoreGained: total - score,
    combo,
    circuitLength: length,
    lampsLit: paths.length,
    rngState: rng.state
  };
}
function applyMove(state, trayIndex, row, col) {
  if (state.over) return null;
  const piece = state.tray[trayIndex];
  if (!piece || !canPlace(state.board, piece, row, col)) return null;
  const events = [
    { type: "PLACED", pieceId: piece.id, trayIndex, at: { r: row, c: col }, cells: placedCells(piece, row, col) }
  ];
  const placed = place(state.board, piece, row, col);
  const res = resolve(placed, state.combo, state.score, state.rngState);
  events.push(...res.events);
  const turned = turnSwitches(res.board);
  const board = turned.board;
  if (turned.cells.length) events.push({ type: "SWITCHES_TURNED", cells: turned.cells });
  let tray = state.tray.map((p, i) => i === trayIndex ? null : p);
  let rngState = res.rngState;
  let nextPieceId = state.nextPieceId;
  if (tray.every((p) => p === null)) {
    const rng = createRng(rngState);
    const fresh = generateTray(board, rng, nextPieceId);
    tray = fresh.tray;
    nextPieceId = fresh.nextId;
    rngState = rng.state;
    events.push({ type: "TRAY_REFILL", tray: fresh.tray });
  }
  const score = state.score + res.scoreGained;
  const over = isGameOver(board, tray);
  if (over) events.push({ type: "GAME_OVER", score });
  return {
    state: {
      ...state,
      board,
      tray,
      score,
      combo: res.combo,
      moves: state.moves + 1,
      circuits: state.circuits + res.lampsLit,
      longestCircuit: Math.max(state.longestCircuit, res.circuitLength),
      rngState,
      nextPieceId,
      over
    },
    events
  };
}
function turnSwitches(board) {
  const cells = [];
  const next = board.map((cell, i) => {
    if (cell.kind !== "switch") return cell;
    cells.push({ r: Math.floor(i / BOARD_SIZE), c: i % BOARD_SIZE });
    return { kind: "switch", wires: rotateCW(cell.wires) };
  });
  return { board: next, cells };
}

// src/online/verify.ts
var MAX_DAILY_MOVES = 600;
var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
var isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
var dailySeed = (date) => seedFromString(date);
function replayDaily(date, moves) {
  if (typeof date !== "string" || !DATE_RE.test(date)) return { ok: false, reason: "bad-date" };
  if (!Array.isArray(moves) || moves.length > MAX_DAILY_MOVES) return { ok: false, reason: "too-many-moves" };
  let state = newGame(dailySeed(date));
  for (let k = 0; k < moves.length; k++) {
    const m = moves[k];
    if (!m || !isInt(m.i, 0, TRAY_SIZE - 1) || !isInt(m.r, 0, BOARD_SIZE - 1) || !isInt(m.c, 0, BOARD_SIZE - 1)) {
      return { ok: false, reason: "bad-move", at: k };
    }
    if (state.over) return { ok: false, reason: "illegal-move", at: k };
    const res = applyMove(state, m.i, m.r, m.c);
    if (!res) return { ok: false, reason: "illegal-move", at: k };
    state = res.state;
  }
  return {
    ok: true,
    score: state.score,
    circuits: state.circuits,
    longest: state.longestCircuit,
    over: state.over,
    moves: moves.length
  };
}
function isPlayableDate(date, nowUtc) {
  if (!DATE_RE.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  const day = Date.UTC(y, m - 1, d);
  const today = Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate());
  return Math.abs(day - today) <= 864e5;
}
export {
  MAX_DAILY_MOVES,
  dailySeed,
  isPlayableDate,
  replayDaily
};
