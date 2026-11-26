// Unpacks a challenge from the address: base64url, then raw DEFLATE (RFC 1951), then UTF-8. Pure code, so that the core
// reads the parameter `c` the runtime gives to start() without the browser's DecompressionStream (which is async).
// Throws on any damaged input.

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function base64url(text: string): Uint8Array {
  const clean = text.replace(/=+$/, "");
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let bits = 0;
  let value = 0;
  let at = 0;
  for (const ch of clean) {
    const v = BASE64.indexOf(ch);
    if (v < 0) throw new Error("base64url");
    value = (value << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[at++] = (value >> bits) & 0xff;
    }
  }
  return out.subarray(0, at);
}

interface Tree {
  counts: Uint16Array;
  symbols: Uint16Array;
}

function tree(lengths: ArrayLike<number>): Tree {
  const counts = new Uint16Array(16);
  for (let i = 0; i < lengths.length; i++) counts[lengths[i] ?? 0]!++;
  counts[0] = 0;
  const offsets = new Uint16Array(16);
  for (let i = 1; i < 16; i++) offsets[i] = offsets[i - 1]! + counts[i - 1]!;
  const symbols = new Uint16Array(lengths.length);
  for (let i = 0; i < lengths.length; i++) {
    const l = lengths[i] ?? 0;
    if (l !== 0) symbols[offsets[l]!++] = i;
  }
  return { counts, symbols };
}

const LENGTH_BASE = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258,
];
const LENGTH_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DIST_BASE = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
  8193, 12289, 16385, 24577,
];
const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const CODE_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

/** Raw DEFLATE → bytes; at most `max` bytes out. */
export function inflateRaw(data: Uint8Array, max = 1 << 20): Uint8Array {
  let pos = 0;
  let bit = 0;
  const out: number[] = [];
  const bits = (n: number): number => {
    let v = 0;
    for (let i = 0; i < n; i++) {
      if (pos >= data.length) throw new Error("inflate: end");
      v |= (((data[pos] ?? 0) >> bit) & 1) << i;
      if (++bit === 8) {
        bit = 0;
        pos++;
      }
    }
    return v;
  };
  const decode = (t: Tree): number => {
    let code = 0;
    let first = 0;
    let index = 0;
    for (let len = 1; len < 16; len++) {
      code |= bits(1);
      const count = t.counts[len] ?? 0;
      if (code - first < count) return t.symbols[index + code - first] ?? 0;
      index += count;
      first = (first + count) << 1;
      code <<= 1;
    }
    throw new Error("inflate: code");
  };
  const fixedLit = tree(Array.from({ length: 288 }, (_, i) => (i < 144 ? 8 : i < 256 ? 9 : i < 280 ? 7 : 8)));
  const fixedDist = tree(Array.from({ length: 30 }, () => 5));
  let last = 0;
  while (last === 0) {
    last = bits(1);
    const type = bits(2);
    if (type === 0) {
      if (bit !== 0) {
        bit = 0;
        pos++;
      }
      const len = (data[pos] ?? 0) | ((data[pos + 1] ?? 0) << 8);
      pos += 4;
      if (pos + len > data.length) throw new Error("inflate: stored");
      for (let i = 0; i < len; i++) out.push(data[pos++] ?? 0);
      continue;
    }
    let lit = fixedLit;
    let dist = fixedDist;
    if (type === 2) {
      const hlit = bits(5) + 257;
      const hdist = bits(5) + 1;
      const hclen = bits(4) + 4;
      const codeLengths = new Uint8Array(19);
      for (let i = 0; i < hclen; i++) codeLengths[CODE_ORDER[i] ?? 0] = bits(3);
      const codeTree = tree(codeLengths);
      const lengths = new Uint8Array(hlit + hdist);
      for (let i = 0; i < hlit + hdist;) {
        const sym = decode(codeTree);
        if (sym < 16) lengths[i++] = sym;
        else {
          const [repeat, value] =
            sym === 16 ? [3 + bits(2), lengths[i - 1] ?? 0] : sym === 17 ? [3 + bits(3), 0] : [11 + bits(7), 0];
          for (let r = 0; r < repeat; r++) lengths[i++] = value;
        }
      }
      lit = tree(lengths.subarray(0, hlit));
      dist = tree(lengths.subarray(hlit));
    } else if (type !== 1) throw new Error("inflate: type");
    for (;;) {
      const sym = decode(lit);
      if (sym < 256) out.push(sym);
      else if (sym === 256) break;
      else {
        const l = sym - 257;
        const length = (LENGTH_BASE[l] ?? 0) + bits(LENGTH_EXTRA[l] ?? 0);
        const d = decode(dist);
        const distance = (DIST_BASE[d] ?? 0) + bits(DIST_EXTRA[d] ?? 0);
        if (distance > out.length) throw new Error("inflate: distance");
        for (let i = 0; i < length; i++) out.push(out[out.length - distance] ?? 0);
      }
      if (out.length > max) throw new Error("inflate: too long");
    }
  }
  return Uint8Array.from(out);
}

/** The JSON value packed in `c`; throws when it is damaged. */
export function unpack(c: string): unknown {
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(inflateRaw(base64url(c), 200_000))) as unknown;
}
