// Small helpers for JSON values that come from outside (a link, a playthrough): narrowing without `any`.
export type Json = null | boolean | number | string | readonly Json[] | { readonly [key: string]: Json };
export type JsonObject = { readonly [key: string]: Json };

export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isInt = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;

/** A message for the learner: a key of the message files and its values. The UI translates it. */
export interface Msg {
  key: string;
  params?: Record<string, string | number>;
}

/** A problem of a challenge or a program: where (a JSON path) and what. */
export interface Problem extends Msg {
  path: string;
}
