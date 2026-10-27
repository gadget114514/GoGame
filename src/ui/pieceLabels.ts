import type { PieceStyle } from './Board3D';

export type LegendRank = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';

export const PIECE_STYLE_LEGEND_NAMES: Partial<
  Record<PieceStyle, Record<LegendRank, string>>
> = {
  'animal-bag': {
    king: 'Dog',
    queen: 'Cat',
    rook: 'Elephant',
    bishop: 'Penguin',
    knight: 'Rabbit',
    pawn: 'Bee'
  },
  'kenney-pets': {
    king: 'Lion',
    queen: 'Cat',
    rook: 'Elephant',
    bishop: 'Penguin',
    knight: 'Bunny',
    pawn: 'Bee'
  },
  'quirky-animals': {
    king: 'Taipan',
    queen: 'Inkfish',
    rook: 'Colobus',
    bishop: 'Pudu',
    knight: 'Muskrat',
    pawn: 'Sparrow'
  }
};
