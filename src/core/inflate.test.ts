/// <reference types="node" />
import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vite-plus/test";
import { BUILT_IN } from "../data/index.ts";
import { unpack } from "./inflate.ts";

const pack = (value: unknown, level: number): string =>
  deflateRawSync(Buffer.from(JSON.stringify(value)), { level }).toString("base64url");

describe("unpack", () => {
  for (const [id, challenge] of Object.entries(BUILT_IN))
    for (const level of [0, 1, 9])
      it(`reads ${id} packed at level ${level}`, () => expect(unpack(pack(challenge, level))).toEqual(challenge));
  it("reads umlauts and quotes", () => expect(unpack(pack({ de: "„Größe“ – ß" }, 9))).toEqual({ de: "„Größe“ – ß" }));
  it("throws on damaged input", () => {
    expect(() => unpack("kaputt")).toThrow();
    expect(() => unpack(pack({ a: 1 }, 9).slice(0, 4))).toThrow();
  });
});
