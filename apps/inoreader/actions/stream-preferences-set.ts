import type { ActionDefinition } from "@w6w/types";
import { InoreaderClient } from "../lib/client.ts";

/**
 * `POST /reader/api/0/preference/stream/set` (zone 2). `s` is the stream id (the root
 * `user/-/state/com.google/root` or a folder like `user/-/label/MIT`), `k` the key — "Only
 * accepted is `subscription-ordering`" — and `v` the concatenated sort ids in the desired
 * order. Answers `OK`.
 */
interface Input {
  streamId: string;
  value: string;
}

const streamPreferencesSet: ActionDefinition<Input> = {
  key: "stream-preferences-set",
  type: "perform",
  resource: "preferences",
  title: "Set Subscription Ordering",
  description: "Save the manual order of the feeds and folders inside a folder (or the root).",
  idempotent: true,
  params: [
    {
      key: "streamId",
      label: "Stream ID",
      type: "string",
      required: true,
      default: "user/-/state/com.google/root",
      placeholder: "user/-/label/MIT",
      hint: "`user/-/state/com.google/root` for the top level, or a folder name.",
    },
    {
      key: "value",
      label: "Ordering",
      type: "text",
      required: true,
      hint: "The sort ids (8 hex characters each, from the subscription and tag lists) " +
        "concatenated in the desired order, with no separator.",
      validation: { pattern: "^([0-9A-Fa-f]{8})+$" },
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Inoreader confirmed with OK" }],

  async execute(input, ctx) {
    const s = (input.streamId ?? "").trim();
    const v = (input.value ?? "").trim();
    if (!s) throw new Error("streamId is required");
    if (!/^([0-9A-Fa-f]{8})+$/.test(v)) {
      throw new Error("value must be one or more 8-character hex sort ids, concatenated");
    }
    await new InoreaderClient(ctx).ok("/preference/stream/set", {
      query: { s, k: "subscription-ordering", v },
    });
    return { ok: true };
  },
};

export default streamPreferencesSet;
