import "server-only";

// Stream the first file out of a ZIP archive stored in R2, as text lines,
// without loading the archive or the uncompressed file into memory (the NANPA
// thousands-block file is 12 MB zipped, 121 MB unzipped; a Worker has 128 MB).
//
// Reads the central directory from the end of the archive (one range read),
// then streams just the entry's compressed bytes through DecompressionStream.
// Supports what the CNAC and NANPA archives use: one entry, stored or
// deflated, no ZIP64.

async function range(bucket: R2Bucket, key: string, offset: number, length: number): Promise<Uint8Array> {
  const obj = await bucket.get(key, { range: { offset, length } });
  if (!obj) throw new Error(`${key}: not found`);
  return new Uint8Array(await obj.arrayBuffer());
}

export async function* zipLines(bucket: R2Bucket, key: string): AsyncGenerator<string> {
  const head = await bucket.head(key);
  if (!head) throw new Error(`${key}: not found`);
  const size = head.size;
  const tailLen = Math.min(size, 65_557);
  const tail = await range(bucket, key, size - tailLen, tailLen);
  const view = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
  let eocd = -1;
  for (let i = tail.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error(`${key}: no end-of-central-directory record`);
  const cdOffset = view.getUint32(eocd + 16, true);
  const cd = await range(bucket, key, cdOffset, 46);
  const cdv = new DataView(cd.buffer, cd.byteOffset, cd.byteLength);
  if (cdv.getUint32(0, true) !== 0x02014b50) throw new Error(`${key}: bad central directory`);
  const method = cdv.getUint16(10, true);
  const compressed = cdv.getUint32(20, true);
  const localOffset = cdv.getUint32(42, true);
  const lh = await range(bucket, key, localOffset, 30);
  const lhv = new DataView(lh.buffer, lh.byteOffset, lh.byteLength);
  if (lhv.getUint32(0, true) !== 0x04034b50) throw new Error(`${key}: bad local header`);
  const dataStart = localOffset + 30 + lhv.getUint16(26, true) + lhv.getUint16(28, true);

  const obj = await bucket.get(key, { range: { offset: dataStart, length: compressed } });
  if (!obj) throw new Error(`${key}: not found`);
  let stream: ReadableStream<Uint8Array> = obj.body;
  if (method === 8) stream = stream.pipeThrough(new DecompressionStream("deflate-raw") as unknown as TransformStream<Uint8Array, Uint8Array>);
  else if (method !== 0) throw new Error(`${key}: unsupported compression method ${method}`);

  // The CNAC and NANPA files are plain ASCII (checked 2026-10-16), so UTF-8
  // decoding reads them exactly; invalid bytes would become U+FFFD, not throw.
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let carry = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    const lines = (carry + decoder.decode(value, { stream: true })).split(/\r?\n/);
    carry = lines.pop() ?? "";
    for (const line of lines) yield line;
  }
  carry += decoder.decode();
  if (carry) yield carry;
}

// Split one CSV line (RFC 4180 quoting; fields don't span lines in these files).
export function csvFields(line: string, sep = ","): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      out.push(field);
      field = "";
    } else field += c;
  }
  out.push(field);
  return out;
}
