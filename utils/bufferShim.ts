import { Buffer as NodeBuffer } from 'buffer';

function patchEncoding(enc?: any): BufferEncoding | undefined {
  const e = typeof enc === 'string' ? enc.toLowerCase() : enc;
  return e === 'utf-16le' || e === 'utf16le' || e === 'ucs2' ? 'utf-8' : enc;
}

export function applyBufferShim() {
  const Buf: typeof NodeBuffer = NodeBuffer;

  const originalFrom = Buf.from.bind(Buf);
  Buf.from = function (data: any, encoding?: any): Buffer {
    encoding = patchEncoding(encoding);
    return originalFrom(data, encoding as any);
  } as typeof Buffer.from;

  const originalAlloc = Buf.alloc.bind(Buf);
  Buf.alloc = function (
    size: number,
    fill?: string | Buffer | number,
    encoding?: any,
  ): Buffer {
    encoding = patchEncoding(encoding);
    return originalAlloc(size, fill as any, encoding as any);
  } as typeof Buffer.alloc;

  const originalWrite = Buf.prototype.write;
  Buf.prototype.write = function (
    string: string,
    offset?: number | string,
    length?: number,
    encoding?: any,
  ): any {
    if (typeof offset === 'string') {
      encoding = patchEncoding(offset);
      return originalWrite.call(this, string, encoding as any);
    }
    encoding = patchEncoding(encoding);
    return originalWrite.call(
      this,
      string,
      offset as number | undefined,
      length as number | undefined,
      encoding as any,
    );
  };

  const originalIsEncoding = Buf.isEncoding.bind(Buf);
  Buf.isEncoding = function (encoding: string): encoding is BufferEncoding {
    const enc = patchEncoding(encoding);
    if (enc === 'utf-8') return true;
    return originalIsEncoding(encoding as BufferEncoding);
  };

  // expose globally
  global.Buffer = Buf as any;
}

// Apply immediately when this module is imported
applyBufferShim();
