export type Language = 'en' | 'ja' | 'es';

export interface Translations {
  board: string;
  ai: string;
  opponent: string;
  dan: string;
  kyu: string;
  manual: string;
  pieces: string;
  pieceClayfoot: string;
  pieceDarkYagami: string;
  pieceAnimalBag: string;
  pieceKenneyPets: string;
  pieceQuirkyAnimals: string;
  pieceStones: string;
  deadStones: string;
  deadCube: string;
  deadStone: string;
  komi: string;
  language: string;
  hoverEval: string;
  hoverEvalTitle: string;
  heatmap: string;
  heatmapTitle: string;
  twoEyes: string;
  wallModel: string;
  wallSeaweed: string;
  wallFence: string;
  trueEyeModel: string;
  trueEyeCute: string;
  trueEyeTrue: string;
  falseEyeModel: string;
  off: string;
  credits: string;
  creditsTitle: string;
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
  king: string;
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
  playerSide: string;
  sideBlack: string;
  sideWhite: string;
  evalGraph: string;
  evalGraphTitle: string;
  evalGraphModeWinrate: string;
  evalGraphModeLead: string;
  evalGraphTooltip: string;
  evalGraphNoData: string;
  evalGraphEven: string;
  blackWinShort: string;
  whiteWinShort: string;
}

const DICTIONARIES: Record<Language, Translations> = {
  en: {
    board: 'Board',
    ai: 'AI',
    opponent: 'Opponent',
    dan: 'KataGo (Dan)',
    kyu: 'KataGo (Kyu)',
    manual: 'Manual (2P)',
    pieces: 'Pieces',
    pieceClayfoot: 'Clayfoot Studios',
    pieceDarkYagami: 'Dark Yagami',
    pieceAnimalBag: 'Animal Bag',
    pieceKenneyPets: 'Kenney Cube Pets',
    pieceQuirkyAnimals: 'Quirky Animals',
    pieceStones: 'Traditional Stones',
    deadStones: 'Dead Stones',
    deadCube: 'Cube',
    deadStone: 'Go Stone',
    playerSide: 'Player Side',
    sideBlack: 'Black (First)',
    sideWhite: 'White (Second)',
    komi: 'Komi',
    language: 'Language',
    hoverEval: 'Hover Eval',
    hoverEvalTitle: 'Realtime ownership preview on mouse hover',
    heatmap: 'Territory',
    heatmapTitle: 'Show predicted territory colors',
    twoEyes: 'Two Eyes',
    wallModel: 'Wall',
    wallSeaweed: 'Seaweed',
    wallFence: 'Fence',
    trueEyeModel: 'True Eye',
    trueEyeCute: 'Cute Flower',
    trueEyeTrue: 'True Eye Flower',
    falseEyeModel: 'False Eye',
    off: 'Off',
    credits: 'Credits',
    creditsTitle: 'Third-party credits',
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
    king: 'King',
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
    sgfLoaded: 'Loaded SGF: {moves} moves',
    evalGraph: 'Eval Graph',
    evalGraphTitle: 'AI Evaluation Graph',
    evalGraphModeWinrate: 'Win Rate %',
    evalGraphModeLead: 'Score Lead pt',
    evalGraphTooltip: 'Move {move}: {rate}% {side} · {lead}',
    evalGraphNoData: 'Move {move}: (Unevaluated)',
    evalGraphEven: 'Even',
    blackWinShort: 'B',
    whiteWinShort: 'W'
  },
  ja: {
    board: '盤面',
    ai: 'AI',
    opponent: '相手',
    dan: 'KataGo (有段)',
    kyu: 'KataGo (級位)',
    manual: 'マニュアル (対人)',
    pieces: '駒・碁石',
    pieceClayfoot: 'Clayfoot Studios',
    pieceDarkYagami: 'Dark Yagami',
    pieceAnimalBag: 'アニマルバッグ',
    pieceKenneyPets: 'Kenney キューブペット',
    pieceQuirkyAnimals: 'Quirky アニマル',
    pieceStones: '伝統的な碁石',
    deadStones: '死石',
    deadCube: 'キューブ',
    deadStone: '碁石',
    playerSide: '手番',
    sideBlack: '黒番 (先手)',
    sideWhite: '白番 (後手)',
    komi: 'コミ',
    language: '言語',
    hoverEval: 'ホバー予測',
    hoverEvalTitle: 'マウスホバー時のリアルタイム勢力予測',
    heatmap: '地合い',
    heatmapTitle: '予測された地を色付け表示',
    twoEyes: '二眼',
    wallModel: '壁',
    wallSeaweed: '海藻',
    wallFence: 'フェンス',
    trueEyeModel: '本眼',
    trueEyeCute: 'かわいい花',
    trueEyeTrue: '本眼の花',
    falseEyeModel: '欠け眼',
    off: 'なし',
    credits: 'クレジット',
    creditsTitle: 'サードパーティのクレジット',
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
    king: 'キング',
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
    sgfLoaded: 'SGF読込完了: {moves}手',
    evalGraph: '評価値グラフ',
    evalGraphTitle: 'AI評価値推移',
    evalGraphModeWinrate: '勝率 %',
    evalGraphModeLead: '目差 pt',
    evalGraphTooltip: '{move}手目: {side}勝率 {rate}% · {lead}',
    evalGraphNoData: '{move}手目: (評価値未計算)',
    evalGraphEven: '互角',
    blackWinShort: '黒',
    whiteWinShort: '白'
  },
  es: {
    board: 'Tablero',
    ai: 'IA',
    opponent: 'Oponente',
    dan: 'KataGo (Dan)',
    kyu: 'KataGo (Kyu)',
    manual: 'Manual (2J)',
    pieces: 'Piezas',
    pieceClayfoot: 'Clayfoot Studios',
    pieceDarkYagami: 'Dark Yagami',
    pieceAnimalBag: 'Bolsa de animales',
    pieceKenneyPets: 'Kenney Cube Pets',
    pieceQuirkyAnimals: 'Animales Quirky',
    pieceStones: 'Piedras tradicionales',
    deadStones: 'Piedras muertas',
    deadCube: 'Cubo',
    deadStone: 'Piedra',
    playerSide: 'Bando',
    sideBlack: 'Negras (Primera)',
    sideWhite: 'Blancas (Segunda)',
    komi: 'Komi',
    language: 'Idioma',
    hoverEval: 'Eval. al pasar',
    hoverEvalTitle: 'Predicción de territorio en tiempo real al pasar el ratón',
    heatmap: 'Territorio',
    heatmapTitle: 'Mostrar colores de territorio previsto',
    twoEyes: 'Dos ojos',
    wallModel: 'Muro',
    wallSeaweed: 'Alga',
    wallFence: 'Valla',
    trueEyeModel: 'Ojo real',
    trueEyeCute: 'Flor cute',
    trueEyeTrue: 'Flor de ojo real',
    falseEyeModel: 'Ojo falso',
    off: 'Ninguno',
    credits: 'Créditos',
    creditsTitle: 'Créditos de terceros',
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
    king: 'Rey',
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
    sgfLoaded: 'SGF cargado: {moves} jugadas',
    evalGraph: 'Gráfico de eval.',
    evalGraphTitle: 'Gráfico de evaluación IA',
    evalGraphModeWinrate: 'Prob. victoria %',
    evalGraphModeLead: 'Ventaja pt',
    evalGraphTooltip: 'Jugada {move}: {rate}% {side} · {lead}',
    evalGraphNoData: 'Jugada {move}: (Sin evaluar)',
    evalGraphEven: 'Igualado',
    blackWinShort: 'N',
    whiteWinShort: 'B'
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
