// Way A: a challenge in the address, ?c=<base64url(deflate-raw(JSON))>. The core reads it (src/core/inflate.ts); the
// authoring page packs it here.

/** The address of a challenge on `page` (the app page of the language): `page?c=<base64url(deflate-raw(JSON))>`. */
export async function linkOf(page: string, json: string): Promise<string> {
  const stream = new Blob([new TextEncoder().encode(JSON.stringify(JSON.parse(json)))])
    .stream()
    .pipeThrough(new CompressionStream("deflate-raw"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const packed = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${page}?c=${packed}`;
}
