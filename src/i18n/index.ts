export type Language = 'en' | 'ja' | 'es';

export interface Translations {
  board: string;
  rules: string;
  rulesChinese: string;
  rulesTitle: string;
  coordinateSystem: string;
  coordinateScreen: string;
  coordinateStandard: string;
  columnLabels: string;
  rowLabels: string;
  letters: string;
  numbers: string;
  cameraProjection: string;
  cameraPerspective: string;
  cameraOrthographic: string;
  boardColor: string;
  boardWood: string;
  boardGreen: string;
  boardDarkGreen: string;
  boardGray: string;
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
  captureEffect: string;
  captureShatter: string;
  captureDissolve: string;
  captureHeight: string;
  komi: string;
  language: string;
  hoverEval: string;
  hoverEvalTitle: string;
  hoverPreview: string;
  heatmap: string;
  heatmapTitle: string;
  heatmapColors: string;
  heatGreenOrange: string;
  heatOrangeGreen: string;
  heatBlueOrange: string;
  heatOrangeBlue: string;
  heatGrayRed: string;
  heatRedGray: string;
  animations: string;
  twoEyes: string;
  wallModel: string;
  wallSeaweed: string;
  wallFence: string;
  fenceModel: string;
  fenceDark: string;
  fenceLight: string;
  fenceNone: string;
  trueEyeModel: string;
  trueEyeCute: string;
  trueEyeTrue: string;
  falseEyeModel: string;
  rankThresholds: string;
  rankThresholdsHint: string;
  rankThresholdsError: string;
  rankThresholdsDead: string;
  resetThresholds: string;
  off: string;
  settings: string;
  settingsTitle: string;
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
  quiz: string;
  quizTitle: string;
  answer: string;
  answerTitle: string;
  quizLegendTitle: string;
  quizBest: string;
  quizWorst: string;
  quizRandom: string;
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
  gameOverTitle: string;
  byMargin: string;
  review: string;
  reviewTitle: string;
  reviewProblem: string;
  reviewAnalyzing: string;
  reviewNoMistakes: string;
  reviewQuestion: string;
  reviewPick: string;
  reviewCorrect: string;
  reviewIncorrect: string;
  reviewBest: string;
  reviewIllegal: string;
  reviewContinue: string;
  reviewNext: string;
  reviewLast: string;
  reviewClose: string;
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
    rules: 'Rules',
    rulesChinese: 'Chinese',
    rulesTitle: 'Chinese rules: area scoring counts stones and surrounded territory.',
    coordinateSystem: 'Coordinate System',
    coordinateScreen: '1,1 (Top-left, numbers)',
    coordinateStandard: 'A,1 (Bottom-left, standard)',
    columnLabels: 'Horizontal Labels',
    rowLabels: 'Vertical Labels',
    letters: 'Letters',
    numbers: 'Numbers',
    cameraProjection: 'Camera',
    cameraPerspective: 'Perspective',
    cameraOrthographic: 'Orthographic',
    boardColor: 'Board Color',
    boardWood: 'Wood',
    boardGreen: 'Green',
    boardDarkGreen: 'Dark Green',
    boardGray: 'Gray',
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
    captureEffect: 'Capture Effect',
    captureShatter: 'Shatter',
    captureDissolve: 'Dissolve',
    captureHeight: 'Shrink Height',
    playerSide: 'Player Side',
    sideBlack: 'Black (First)',
    sideWhite: 'White (Second)',
    komi: 'Komi',
    language: 'Language',
    hoverEval: 'Hover Eval',
    hoverEvalTitle: 'Realtime ownership preview on mouse hover',
    hoverPreview: 'Hover Preview',
    heatmap: 'Territory',
    heatmapTitle: 'Show predicted territory colors',
    heatmapColors: 'Territory Colors',
    heatGreenOrange: 'Green / Orange',
    heatOrangeGreen: 'Orange / Green',
    heatBlueOrange: 'Blue / Orange',
    heatOrangeBlue: 'Orange / Blue',
    heatGrayRed: 'Gray / Red',
    heatRedGray: 'Red / Gray',
    animations: 'Animations',
    twoEyes: 'Two Eyes',
    wallModel: 'Wall',
    wallSeaweed: 'Seaweed',
    wallFence: 'Fence',
    fenceModel: 'Fence Model',
    fenceDark: 'Fence (Dark)',
    fenceLight: 'Fence (Light)',
    fenceNone: 'None',
    trueEyeModel: 'True Eye',
    trueEyeCute: 'Cute Flower',
    trueEyeTrue: 'True Eye Flower',
    falseEyeModel: 'False Eye',
    rankThresholds: 'Piece Strength',
    rankThresholdsHint: 'Minimum ownership per rank',
    rankThresholdsError:
      'Enter descending values: King > Queen > Rook > Bishop > Knight > 0 (1–100%).',
    rankThresholdsDead: 'Dead < 0%',
    resetThresholds: 'Reset',
    off: 'Off',
    settings: 'Settings',
    settingsTitle: 'Game settings',
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
    quiz: 'Quiz',
    quizTitle: 'Mark several candidate moves',
    answer: 'Answer',
    answerTitle: 'Reveal: best blue, worst red, others white',
    quizLegendTitle: 'Answer',
    quizBest: 'Best move (blue)',
    quizWorst: 'Worst move (red)',
    quizRandom: 'Random (white)',
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
    gameOverTitle: 'Game Over',
    byMargin: ' by {margin}',
    review: 'Review',
    reviewTitle: 'Game Review',
    reviewProblem: 'Problem {current} / {total}',
    reviewAnalyzing: 'Analyzing the game…',
    reviewNoMistakes: 'No clear mistakes were found in this game.',
    reviewQuestion: 'You played {coord}. Where should you have played?',
    reviewPick: 'Click an intersection on the board.',
    reviewCorrect: 'Correct!',
    reviewIncorrect: 'Incorrect. The best move was {coord}.',
    reviewBest: 'Best move: {coord}',
    reviewIllegal: 'You cannot play there.',
    reviewContinue: 'Continue from here',
    reviewNext: 'Next problem',
    reviewLast: 'This is the last problem.',
    reviewClose: 'End review',
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
    rules: 'ルール',
    rulesChinese: '中国ルール',
    rulesTitle: '中国ルール：石と囲んだ地の合計（面積）で計算します。',
    coordinateSystem: '座標系',
    coordinateScreen: '1,1 (左上基準・数字)',
    coordinateStandard: 'A,1 (左下基準・標準)',
    columnLabels: '横軸ラベル',
    rowLabels: '縦軸ラベル',
    letters: '英字',
    numbers: '数字',
    cameraProjection: 'カメラ',
    cameraPerspective: 'パースペクティブ',
    cameraOrthographic: 'オルソグラフィック',
    boardColor: '盤面の色',
    boardWood: '木目',
    boardGreen: '緑',
    boardDarkGreen: '濃い緑',
    boardGray: 'グレー',
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
    captureEffect: '捕獲時の演出',
    captureShatter: '四散',
    captureDissolve: 'ディゾルブ',
    captureHeight: '高さで消去',
    playerSide: '手番',
    sideBlack: '黒番 (先手)',
    sideWhite: '白番 (後手)',
    komi: 'コミ',
    language: '言語',
    hoverEval: 'ホバー予測',
    hoverEvalTitle: 'マウスホバー時のリアルタイム勢力予測',
    hoverPreview: 'ホバープレビュー',
    heatmap: '地合い',
    heatmapTitle: '予測された地を色付け表示',
    heatmapColors: '地合いの色',
    heatGreenOrange: '緑 / オレンジ',
    heatOrangeGreen: 'オレンジ / 緑',
    heatBlueOrange: '青 / オレンジ',
    heatOrangeBlue: 'オレンジ / 青',
    heatGrayRed: 'グレー / 赤',
    heatRedGray: '赤 / グレー',
    animations: 'アニメーション',
    twoEyes: '二眼',
    wallModel: '壁',
    wallSeaweed: '海藻',
    wallFence: 'フェンス',
    fenceModel: 'フェンスモデル',
    fenceDark: 'フェンス (ダーク)',
    fenceLight: 'フェンス (ライト)',
    fenceNone: 'なし',
    trueEyeModel: '本眼',
    trueEyeCute: 'かわいい花',
    trueEyeTrue: '本眼の花',
    falseEyeModel: '欠け眼',
    rankThresholds: '駒の勢力',
    rankThresholdsHint: '各駒に必要な最低勢力',
    rankThresholdsError:
      'King > Queen > Rook > Bishop > Knight > 0 の順で 1–100% を入力してください。',
    rankThresholdsDead: '死 < 0%',
    resetThresholds: '初期値',
    off: 'なし',
    settings: '設定',
    settingsTitle: 'ゲーム設定',
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
    quiz: 'クイズ',
    quizTitle: '候補の交点をいくつかマーク',
    answer: '答え',
    answerTitle: '答え: 最善 青 / 最悪 赤 / ランダム 白',
    quizLegendTitle: '答え',
    quizBest: '最善手 (青)',
    quizWorst: '最悪手 (赤)',
    quizRandom: 'ランダム (白)',
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
    gameOverTitle: '終局',
    byMargin: ' {margin}目勝ち',
    review: 'ふりかえり',
    reviewTitle: 'ふりかえり',
    reviewProblem: '問題 {current} / {total}',
    reviewAnalyzing: '局面を分析中…',
    reviewNoMistakes: 'この対局に明確な悪手は見つかりませんでした。',
    reviewQuestion: 'あなたは {coord} に打ちました。どこに打つべきでしたか？',
    reviewPick: '盤面の交点をクリックしてください。',
    reviewCorrect: '正解です！',
    reviewIncorrect: '不正解です。最善手は {coord} でした。',
    reviewBest: '最善手: {coord}',
    reviewIllegal: 'そこには打てません。',
    reviewContinue: 'この局面から続ける',
    reviewNext: '次の問題',
    reviewLast: '最後の問題です。',
    reviewClose: 'ふりかえりを終了',
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
    rules: 'Reglas',
    rulesChinese: 'Chino',
    rulesTitle: 'Reglas chinas: puntuación por área (piedras y territorio rodeado).',
    coordinateSystem: 'Sistema de coordenadas',
    coordinateScreen: '1,1 (arriba a la izquierda, números)',
    coordinateStandard: 'A,1 (abajo a la izquierda, estándar)',
    columnLabels: 'Etiquetas horizontales',
    rowLabels: 'Etiquetas verticales',
    letters: 'Letras',
    numbers: 'Números',
    cameraProjection: 'Cámara',
    cameraPerspective: 'Perspectiva',
    cameraOrthographic: 'Ortográfica',
    boardColor: 'Color del tablero',
    boardWood: 'Madera',
    boardGreen: 'Verde',
    boardDarkGreen: 'Verde oscuro',
    boardGray: 'Gris',
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
    captureEffect: 'Efecto de captura',
    captureShatter: 'Fragmentar',
    captureDissolve: 'Disolver',
    captureHeight: 'Altura',
    playerSide: 'Bando',
    sideBlack: 'Negras (Primera)',
    sideWhite: 'Blancas (Segunda)',
    komi: 'Komi',
    language: 'Idioma',
    hoverEval: 'Eval. al pasar',
    hoverEvalTitle: 'Predicción de territorio en tiempo real al pasar el ratón',
    hoverPreview: 'Vista previa al pasar',
    heatmap: 'Territorio',
    heatmapTitle: 'Mostrar colores de territorio previsto',
    heatmapColors: 'Colores del territorio',
    heatGreenOrange: 'Verde / Naranja',
    heatOrangeGreen: 'Naranja / Verde',
    heatBlueOrange: 'Azul / Naranja',
    heatOrangeBlue: 'Naranja / Azul',
    heatGrayRed: 'Gris / Rojo',
    heatRedGray: 'Rojo / Gris',
    animations: 'Animaciones',
    twoEyes: 'Dos ojos',
    wallModel: 'Muro',
    wallSeaweed: 'Alga',
    wallFence: 'Valla',
    fenceModel: 'Modelo de valla',
    fenceDark: 'Valla (oscura)',
    fenceLight: 'Valla (clara)',
    fenceNone: 'Ninguno',
    trueEyeModel: 'Ojo real',
    trueEyeCute: 'Flor cute',
    trueEyeTrue: 'Flor de ojo real',
    falseEyeModel: 'Ojo falso',
    rankThresholds: 'Fuerza de pieza',
    rankThresholdsHint: 'Posesión mínima por pieza',
    rankThresholdsError:
      'Introduce valores descendentes: Rey > Reina > Torre > Alfil > Caballo > 0 (1–100 %).',
    rankThresholdsDead: 'Muerta < 0%',
    resetThresholds: 'Restablecer',
    off: 'Ninguno',
    settings: 'Ajustes',
    settingsTitle: 'Ajustes del juego',
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
    quiz: 'Quiz',
    quizTitle: 'Marcar varias jugadas candidatas',
    answer: 'Respuesta',
    answerTitle: 'Mostrar: mejor azul, peor rojo, otras blanco',
    quizLegendTitle: 'Respuesta',
    quizBest: 'Mejor jugada (azul)',
    quizWorst: 'Peor jugada (rojo)',
    quizRandom: 'Aleatoria (blanco)',
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
    gameOverTitle: 'Fin de la partida',
    byMargin: ' por {margin}',
    review: 'Revisión',
    reviewTitle: 'Revisión de la partida',
    reviewProblem: 'Problema {current} / {total}',
    reviewAnalyzing: 'Analizando la partida…',
    reviewNoMistakes: 'No se encontraron errores claros en esta partida.',
    reviewQuestion: 'Jugaste {coord}. ¿Dónde deberías haber jugado?',
    reviewPick: 'Haz clic en una intersección del tablero.',
    reviewCorrect: '¡Correcto!',
    reviewIncorrect: 'Incorrecto. La mejor jugada era {coord}.',
    reviewBest: 'Mejor jugada: {coord}',
    reviewIllegal: 'No puedes jugar ahí.',
    reviewContinue: 'Continuar desde aquí',
    reviewNext: 'Siguiente problema',
    reviewLast: 'Este es el último problema.',
    reviewClose: 'Terminar revisión',
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
