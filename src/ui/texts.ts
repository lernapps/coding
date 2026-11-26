// Learner texts by the page's language, and messages of the core (a key and its values) as text. A value that names a
// word of the message files (`word-<value>`) is translated too ("east" → "Osten (rechts)").
import { translator } from "@lernapps/tooling/i18n";
import type { Msg } from "../core/json.ts";
import type { Text } from "../core/challenge.ts";
import de from "../messages/de.json";
import en from "../messages/en.json";

export type Key = Extract<keyof typeof de, string>;
export type Lang = "de" | "en";

export const langOf = (lang: string): Lang => (lang === "en" ? "en" : "de");

export function texts(lang: string): {
  t: (key: Key, params?: Record<string, string | number>) => string;
  say: (msg: Msg) => string;
  text: (value: Text | undefined) => string;
} {
  const l = langOf(lang);
  const messages: Record<string, string> = l === "en" ? en : de;
  const t = translator(messages, l === "en" ? "en-GB" : "de-DE");
  const say = (msg: Msg): string => {
    const params: Record<string, string | number> = {};
    for (const [name, value] of Object.entries(msg.params ?? {}))
      params[name] = typeof value === "string" && `word-${value}` in messages ? t(`word-${value}`) : value;
    return t(msg.key, params);
  };
  const text = (value: Text | undefined): string => (value === undefined ? "" : (value[l] ?? value.de));
  return { t, say, text };
}
