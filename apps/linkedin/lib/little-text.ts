/**
 * LinkedIn's Posts API stores `commentary` as `little` — a compact markup
 * that gives special meaning to a fixed set of characters (mentions
 * `@[label](urn)`, hashtags `#word` / `{hashtag|#|word}`). Plain text that
 * happens to contain one of those characters gets misinterpreted unless it's
 * escaped with a backslash first.
 *
 * `create-post` doesn't expose a way to author mentions or hashtag templates,
 * so every reserved character in `commentary` is escaped unconditionally —
 * the safe default for a plain-text field.
 *
 * Reserved-character list and the backslash-escaping rule are exactly the
 * `little` grammar's `Text` production:
 * https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/little-text-format
 */
const RESERVED = /[\\|{}@[\]()<>#*_~]/g;

export function escapeLittleText(text: string): string {
  return text.replace(RESERVED, (ch) => `\\${ch}`);
}
