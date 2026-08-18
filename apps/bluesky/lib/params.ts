import type { Param } from "@w6w/types";

/** The cursor every paged read takes and returns. */
export const CURSOR_PARAM: Param = {
  key: "cursor",
  label: "Cursor",
  type: "string",
  default: "",
  hint: "The `cursor` from the previous page. Absent in a response means the end.",
};

/** Bluesky's page size, capped at 100 on nearly every list. */
export function limitParam(defaultLimit = 50, max = 100): Param {
  return {
    key: "limit",
    label: "Limit",
    type: "number",
    default: defaultLimit,
    hint: `1 to ${max}.`,
  };
}

/** A handle or a DID, wherever an account is named. */
export function actorParam(label: string, hint: string): Param {
  return {
    key: "actor",
    label,
    type: "string",
    required: true,
    default: "",
    placeholder: "alice.bsky.social",
    hint,
  };
}
