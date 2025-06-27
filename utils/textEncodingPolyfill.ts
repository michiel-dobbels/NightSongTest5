function decodeUTF16LE(bytes: Uint8Array): string {
  const len = bytes.length - (bytes.length % 2);
  let out = '';
  for (let i = 0; i < len; i += 2) {
    out += String.fromCharCode(bytes[i] | (bytes[i + 1] << 8));
  }
  return out;
}

function encodeUTF16LE(str: string): Uint8Array {
  const buf = new Uint8Array(str.length * 2);
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    buf[i * 2] = code & 0xff;
    buf[i * 2 + 1] = code >> 8;
  }
  return buf;
}

class TextEncoderPolyfill {
  private enc: string;
  constructor(encoding: string = 'utf-8') {
    this.enc = encoding.toLowerCase();
  }
  encode(str: string): Uint8Array {
    if (this.enc === 'utf-16le' || this.enc === 'utf16le' || this.enc === 'ucs2') {
      return encodeUTF16LE(str);
    }
    return new Uint8Array(Buffer.from(str, 'utf-8'));
  }
}

class TextDecoderPolyfill {
  readonly encoding: string;
  constructor(encoding: string = 'utf-8') {
    this.encoding = encoding.toLowerCase();
  }
  decode(data?: ArrayBuffer | Uint8Array | null): string {
    if (!data) return '';
    const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    if (this.encoding === 'utf-16le' || this.encoding === 'utf16le' || this.encoding === 'ucs2') {
      return decodeUTF16LE(bytes);
    }
    return Buffer.from(bytes).toString('utf-8');
  }
}

export function applyTextEncodingPolyfill() {
  if (typeof global.TextEncoder === 'undefined') {
    ;(global as any).TextEncoder = TextEncoderPolyfill;
  }
  if (typeof global.TextDecoder === 'undefined') {
    ;(global as any).TextDecoder = TextDecoderPolyfill;
  }
}

applyTextEncodingPolyfill();
