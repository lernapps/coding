// Way A: a challenge in the address, ?c=<base64url(deflate-raw(JSON))>. Read in the browser by the root component.
// TODO(lernapps/app-templates#201): the runtime will give the address's parameters to start(); then this moves there.

/** The challenge of `search` as JSON; null when it cannot be read; undefined when the address has none. */
export async function readChallenge(search: string, max: number): Promise<unknown> {
  const packed = new URLSearchParams(search).get("c");
  if (packed === null) return undefined;
  if (packed.length > max) return { error: "too-long" };
  try {
    const base64 = packed.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return JSON.parse(await new Response(stream).text()) as unknown;
  } catch {
    return null;
  }
}
