import type { Param } from "@w6w/types";

/**
 * Almost every catalog read accepts an optional market filter. Declaring it
 * once keeps the handful of actions that use it consistent.
 */
export const market: Param = {
  key: "market",
  label: "Market",
  type: "string",
  hint: "ISO 3166-1 alpha-2 country code (e.g. US). Restricts results to what's playable there.",
};

/** `id` accepts a bare Spotify ID or a `spotify:<type>:<id>` URI. */
export function idParam(label: string, placeholder: string): Param {
  return {
    key: "id",
    label,
    type: "string",
    required: true,
    placeholder,
    hint: "A Spotify ID or URI — both are accepted.",
  };
}
