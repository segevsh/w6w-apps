import type { ActionDefinition } from "@w6w/types";
import { MuxClient } from "../lib/client.ts";

/**
 * `PUT /video/v1/live-streams/{id}/complete` — say the broadcast is over now.
 *
 * Without it, Mux waits out the whole `reconnect_window` after the encoder
 * stops before deciding the stream has ended — which is correct when a
 * connection drops mid-broadcast, and needlessly slow when the broadcaster
 * simply finished. Calling this ends it immediately and closes the recording,
 * so the asset appears in seconds rather than a minute later.
 *
 * That makes it the right call at the end of a scheduled event: the workflow
 * knows the broadcast is over, and Mux does not.
 *
 * It does not delete anything — the stream stays, ready for the next broadcast,
 * and the recording becomes an asset.
 */
const action: ActionDefinition = {
  key: "live-stream-complete",
  type: "perform",
  resource: "live",
  title: "Complete a live stream",
  description:
    "End the current broadcast immediately rather than waiting out the reconnect window — so " +
    "the recording becomes an asset in seconds. The stream itself survives.",
  idempotent: true,
  params: [
    {
      key: "liveStreamId",
      label: "Live Stream ID",
      type: "string",
      required: true,
      default: "",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Completed" },
    { key: "liveStreamId", type: "string", label: "Live stream ID" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const liveStreamId = String(p.liveStreamId ?? "").trim();
    if (!liveStreamId) throw new Error("`liveStreamId` is required");

    await new MuxClient(ctx).request(
      `/video/v1/live-streams/${encodeURIComponent(liveStreamId)}/complete`,
      { method: "PUT" },
    );
    return { ok: true, liveStreamId };
  },
};

export default action;
