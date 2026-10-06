import type { ActionDefinition } from "@w6w/types";
import { InoreaderClient } from "../lib/client.ts";

/**
 * `GET /reader/api/0/preference/stream/list` (zone 1) — per-folder preferences, keyed by
 * stream id (the root `user/<id>/state/com.google/root` plus each folder). Each value is a list
 * of `{id, value}` pairs: `subscription-ordering` (concatenated 8-hex-char sort ids; see the
 * Sort IDs page) and `is-expanded`.
 */
const streamPreferencesList: ActionDefinition<Record<string, never>> = {
  key: "stream-preferences-list",
  type: "read",
  resource: "preferences",
  title: "List Stream Preferences",
  description: "Folder-level preferences such as subscription ordering and expanded state.",
  params: [],
  output: [{ key: "streamprefs", type: "object", label: "Preferences keyed by stream ID" }],

  async execute(_input, ctx) {
    const body = await new InoreaderClient(ctx).json<{ streamprefs?: unknown }>(
      "/preference/stream/list",
    );
    return { streamprefs: body.streamprefs ?? {} };
  },
};

export default streamPreferencesList;
