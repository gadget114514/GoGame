export type Language = 'en' | 'ja' | 'es';

export interface Translations {
  board: string;
  ai: string;
  dan: string;
  kyu: string;
  pieces: string;
  pieceClayfoot: string;
  pieceDarkYagami: string;
  pieceStones: string;
  komi: string;
  language: string;
  hoverEval: string;
  hoverEvalTitle: string;
  newGame: string;
  newGameTitle: string;
  pass: string;
  passTitle: string;
  undo: string;
  undoTitle: string;
  eval: string;
  evalTitle: string;
  toggleView2D: string;
  toggleView3D: string;
  toggleViewTitle: string;
  save: string;
  saveTitle: string;
  load: string;
  loadTitle: string;
  legendTitle: string;
  legendSubtitle: string;
  queen: string;
  rook: string;
  bishop: string;
  knight: string;
  pawn: string;
  dead: string;
  thinking: string;
  bootLoading: string;
  aiUnavailable: string;
  aiError: string;
  invalidSgf: string;
  black: string;
  white: string;
  draw: string;
  blackToPlay: string;
  turnToPlay: string;
  lastMove: string;
  passMove: string;
  gameOver: string;
  byMargin: string;
  even: string;
  preview: string;
  paddedNet: string;
  firstMove: string;
  prevMove: string;
  play: string;
  pause: string;
  nextMove: string;
  lastMoveBtn: string;
  speed: string;
  replay: string;
  sgfLoaded: string;
}

const DICTIONARIES: Record<Language, Translations> = {
  en: {
    board: 'Board',
    ai: 'AI',
    dan: 'Dan',
    kyu: 'Kyu',
    pieces: 'Pieces',
    pieceClayfoot: 'Clayfoot Studios',
    pieceDarkYagami: 'Dark Yagami',
    pieceStones: 'Traditional Stones',
    komi: 'Komi',
    language: 'Language',
    hoverEval: 'Hover Eval',
    hoverEvalTitle: 'Realtime ownership preview on mouse hover',
    newGame: 'New',
    newGameTitle: 'Start a new game',
    pass: 'Pass',
    passTitle: 'Pass current turn',
    undo: 'Undo',
    undoTitle: 'Undo move',
    eval: 'Eval',
    evalTitle: 'Evaluate position with KataGo',
    toggleView2D: '2D',
    toggleView3D: '3D',
    toggleViewTitle: 'Toggle 2D / 3D view',
    save: 'Save',
    saveTitle: 'Save game to SGF file',
    load: 'Load',
    loadTitle: 'Load game from SGF file',
    legendTitle: 'Piece strength',
    legendSubtitle: 'strong → weak',
    queen: 'Queen',
    rook: 'Rook',
    bishop: 'Bishop',
    knight: 'Knight',
    pawn: 'Pawn',
    dead: 'Dead',
    thinking: 'Thinking…',
    bootLoading: 'Loading KataGo model…',
    aiUnavailable: 'AI unavailable — check console',
    aiError: 'AI error — check console',
    invalidSgf: 'Invalid SGF file',
    black: 'Black',
    white: 'White',
    draw: 'Draw',
    blackToPlay: 'Black to play',
    turnToPlay: '{side} to play · move {move}',
    lastMove: 'Last: {color} {coord}',
    passMove: 'Pass',
    gameOver: 'Game over — {winner}{margin}',
    byMargin: ' by {margin}',
    even: 'Even',
    preview: 'Preview',
    paddedNet: 'padded 19x19 net',
    firstMove: 'First move',
    prevMove: 'Previous move',
    play: 'Play',
    pause: 'Pause',
    nextMove: 'Next move',
    lastMoveBtn: 'Last move',
    speed: 'Speed',
    replay: 'Replay',
    sgfLoaded: 'Loaded SGF: {moves} moves'
  },
  ja: {
    board: '盤面',
    ai: 'AI',
    dan: '有段',
    kyu: '級位',
    pieces: '駒・碁石',
    pieceClayfoot: 'Clayfoot Studios',
    pieceDarkYagami: 'Dark Yagami',
    pieceStones: '伝統的な碁石',
    komi: 'コミ',
    language: '言語',
    hoverEval: 'ホバー予測',
    hoverEvalTitle: 'マウスホバー時のリアルタイム勢力予測',
    newGame: '対局開始',
    newGameTitle: '新しい対局を開始',
    pass: 'パス',
    passTitle: '手番をパスする',
    undo: '待った',
    undoTitle: '直前の着手を戻す',
    eval: '形勢判断',
    evalTitle: 'KataGo AIで局面を評価',
    toggleView2D: '2D',
    toggleView3D: '3D',
    toggleViewTitle: '2D / 3D 表示切替',
    save: '保存',
    saveTitle: '棋譜をSGFファイルとして保存',
    load: '読込',
    loadTitle: 'SGF棋譜ファイルを読み込む',
    legendTitle: '駒の勢力',
    legendSubtitle: '強 → 弱',
    queen: 'クイーン',
    rook: 'ルーク',
    bishop: 'ビショップ',
    knight: 'ナイト',
    pawn: 'ポーン',
    dead: '死石',
    thinking: '思考中…',
    bootLoading: 'KataGoモデル読込中…',
    aiUnavailable: 'AIを利用できません（コンソールを確認）',
    aiError: 'AIエラー（コンソールを確認）',
    invalidSgf: '無効なSGFファイルです',
    black: '黒',
    white: '白',
    draw: '持碁 (引分)',
    blackToPlay: '黒の手番',
    turnToPlay: '{side}の手番 · {move}手目',
    lastMove: '直前: {color} {coord}',
    passMove: 'パス',
    gameOver: '終局 — {winner}{margin}',
    byMargin: ' {margin}目勝ち',
    even: '互角',
    preview: '予測',
    paddedNet: '19路補正モデル',
    firstMove: '最初の手',
    prevMove: '前の一手',
    play: '再生',
    pause: '一時停止',
    nextMove: '次の一手',
    lastMoveBtn: '最後の手',
    speed: '速度',
    replay: '棋譜再生',
    sgfLoaded: 'SGF読込完了: {moves}手'
  },
  es: {
    board: 'Tablero',
    ai: 'IA',
    dan: 'Dan',
    kyu: 'Kyu',
    pieces: 'Piezas',
    pieceClayfoot: 'Clayfoot Studios',
    pieceDarkYagami: 'Dark Yagami',
    pieceStones: 'Piedras tradicionales',
    komi: 'Komi',
    language: 'Idioma',
    hoverEval: 'Eval. al pasar',
    hoverEvalTitle: 'Predicción de territorio en tiempo real al pasar el ratón',
    newGame: 'Nueva',
    newGameTitle: 'Iniciar una nueva partida',
    pass: 'Pasar',
    passTitle: 'Pasar el turno actual',
    undo: 'Deshacer',
    undoTitle: 'Deshacer jugada',
    eval: 'Evaluar',
    evalTitle: 'Evaluar posición con KataGo',
    toggleView2D: '2D',
    toggleView3D: '3D',
    toggleViewTitle: 'Alternar vista 2D / 3D',
    save: 'Guardar',
    saveTitle: 'Guardar partida en archivo SGF',
    load: 'Cargar',
    loadTitle: 'Cargar partida desde archivo SGF',
    legendTitle: 'Fuerza de pieza',
    legendSubtitle: 'fuerte → débil',
    queen: 'Reina',
    rook: 'Torre',
    bishop: 'Alfil',
    knight: 'Caballo',
    pawn: 'Peón',
    dead: 'Muerta',
    thinking: 'Pensando…',
    bootLoading: 'Cargando modelo KataGo…',
    aiUnavailable: 'IA no disponible — revisa la consola',
    aiError: 'Error de IA — revisa la consola',
    invalidSgf: 'Archivo SGF no válido',
    black: 'Negras',
    white: 'Blancas',
    draw: 'Empate',
    blackToPlay: 'Juegan negras',
    turnToPlay: '{side} para jugar · jugada {move}',
    lastMove: 'Última: {color} {coord}',
    passMove: 'Pase',
    gameOver: 'Fin de partida — {winner}{margin}',
    byMargin: ' por {margin}',
    even: 'Igualado',
    preview: 'Prevista',
    paddedNet: 'red 19x19 ajustada',
    firstMove: 'Primera jugada',
    prevMove: 'Jugada anterior',
    play: 'Reproducir',
    pause: 'Pausar',
    nextMove: 'Siguiente jugada',
    lastMoveBtn: 'Última jugada',
    speed: 'Velocidad',
    replay: 'Reproducir partida',
    sgfLoaded: 'SGF cargado: {moves} jugadas'
  }
};

let currentLanguage: Language = 'en';

export function isLanguage(value: string): value is Language {
  return value === 'en' || value === 'ja' || value === 'es';
}

export function detectInitialLanguage(): Language {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('gogame:language');
      if (saved && isLanguage(saved)) return saved;
    }
  } catch {
    // ignore
  }

  const browser = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'en';
  if (browser.startsWith('ja')) return 'ja';
  if (browser.startsWith('es')) return 'es';
  return 'en';
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('gogame:language', lang);
    }
  } catch {
    // localStorage may be unavailable
  }
}

export function t(key: keyof Translations, params?: Record<string, string | number>): string {
  const dict = DICTIONARIES[currentLanguage] ?? DICTIONARIES.en;
  let text = dict[key] ?? DICTIONARIES.en[key] ?? String(key);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return text;
}
