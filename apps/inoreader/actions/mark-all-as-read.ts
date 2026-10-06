import type { ActionDefinition } from "@w6w/types";
import { InoreaderClient } from "../lib/client.ts";

/**
 * `POST /reader/api/0/mark-all-as-read` (zone 2) — mark everything in a stream read. `s` is the
 * stream id; `ts` is a unix timestamp (seconds or microseconds) "generated the last time the
 * list stream was fetched and displayed to the user, so it won't mark as read items that the
 * user never got". The vendor says to "please provide" it, so it is required here: omitting it
 * would mark articles the caller has not seen. Answers `OK`.
 */
interface Input {
  streamId: string;
  timestamp: number;
}

const markAllAsRead: ActionDefinition<Input> = {
  key: "mark-all-as-read",
  type: "perform",
  resource: "items",
  title: "Mark Stream as Read",
  description: "Mark every article in a feed, folder or tag read, up to a timestamp.",
  idempotent: true,
  params: [
    {
      key: "streamId",
      label: "Stream ID",
      type: "string",
      required: true,
      placeholder: "user/-/label/Tech",
      hint: "A feed (`feed/<xml url>`), folder or tag (`user/-/label/<name>`), or a system stream.",
    },
    {
      key: "timestamp",
      label: "Up to timestamp",
      type: "number",
      required: true,
      hint: "Unix timestamp (seconds or microseconds): only articles up to this moment are " +
        "marked. Use the time you last fetched the stream so unseen articles stay unread.",
      validation: { min: 1 },
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Inoreader confirmed with OK" }],

  async execute(input, ctx) {
    const s = (input.streamId ?? "").trim();
    if (!s) throw new Error("streamId is required");
    if (typeof input.timestamp !== "number" || !(input.timestamp > 0)) {
      throw new Error("timestamp is required (unix seconds or microseconds)");
    }
    await new InoreaderClient(ctx).ok("/mark-all-as-read", {
      query: { s, ts: Math.trunc(input.timestamp) },
    });
    return { ok: true };
  },
};

export default markAllAsRead;
