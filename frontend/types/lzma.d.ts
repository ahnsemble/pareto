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

declare module 'lzma/src/lzma-d-min.js' {
  const moduleValue: {
    LZMA_WORKER?: {
      decompress(
        input: ArrayLike<number> | Buffer,
        callback?: (result: unknown, error?: unknown) => void,
      ): unknown;
    };
  };
  export default moduleValue;
}

declare module 'lzma/src/lzma-c-min.js' {
  const moduleValue: {
    LZMA_WORKER?: {
      compress(
        input: string | ArrayLike<number> | Buffer,
        mode?: number,
        callback?: (result: unknown, error?: unknown) => void,
      ): unknown;
    };
  };
  export default moduleValue;
}
