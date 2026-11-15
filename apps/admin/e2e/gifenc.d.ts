// gifenc에는 타입 정의가 없어, README 키오스크 흐름 GIF(e2e/readme.screenshots.ts)에서 쓰는 부분만 적습니다.
declare module "gifenc" {
  export function quantize(rgba: Uint8Array, maxColors: number): number[][];
  export function applyPalette(rgba: Uint8Array, palette: number[][]): Uint8Array;
  export function GIFEncoder(): {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options: { palette: number[][]; delay: number },
    ): void;
    finish(): void;
    bytes(): Uint8Array;
  };
}
