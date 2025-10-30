declare module 'headbreaker' {
  export interface CanvasOptions {
    width: number;
    height: number;
    pieceSize: number;
    proximity?: number;
    borderFill?: number;
    strokeWidth?: number;
    lineSoftness?: number;
    painter?: unknown;
    outline?: unknown;
    image?: HTMLImageElement;
    preventOffstageDrag?: boolean;
    fixed?: boolean;
  }

  export class Canvas {
    constructor(containerId: string, opts: CanvasOptions);
    adjustImagesToPuzzleHeight(): void;
    autogenerate(opts: {
      horizontalPiecesCount: number;
      verticalPiecesCount: number;
      metadata?: Array<{ pid: string; r?: number; c?: number }>;
    }): void;
    reframeWithinDimensions(): void;
    shuffle(ratio?: number): void;
    draw(): void;
    redraw(): void;
    onConnect(handler: (piece: unknown, fig: unknown, targetPiece: unknown) => void): void;
    onDisconnect(handler: (piece: unknown) => void): void;
    attachSolvedValidator(): void;
    onValid(handler: () => void): void;
    attachConnectionRequirement(predicate: (a: unknown, b: unknown) => boolean): void;
  }

  export const painters: { Konva: new () => unknown };
  export const outline: { Rounded: new () => unknown };
}
