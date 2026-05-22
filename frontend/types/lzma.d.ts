declare module 'lzma' {
  export function decompress(
    input: ArrayLike<number> | Buffer,
    callback?: (result: unknown, error?: unknown) => void,
  ): unknown;

  export function compress(
    input: string | ArrayLike<number> | Buffer,
    mode?: number,
    callback?: (result: unknown, error?: unknown) => void,
  ): unknown;
}
