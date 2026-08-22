import type { ActionDefinition } from "@w6w/types";
import { MuxClient } from "../lib/client.ts";

/**
 * `DELETE /video/v1/live-streams/{id}` — retire a stream for good.
 *
 * This invalidates the **stream key immediately**, so any encoder configured
 * with it stops being able to broadcast — which is the point when a
 * broadcaster's access should end, and a nasty surprise when done to a stream
 * somebody is about to use.
 *
 * The **recordings survive**: past broadcasts are separate assets and are not
 * touched, so this ends future access rather than erasing history. Deleting
 * those is `asset-delete`, one at a time and deliberately.
 *
 * Ending a broadcast in progress is `live-stream-complete`, which is almost
 * always what was meant.
 */
const action: ActionDefinition = {
  key: "live-stream-delete",
  type: "perform",
  resource: "live",
  title: "Delete a live stream",
  description:
    "Retire a stream and invalidate its key. Past recordings survive as assets — this ends " +
    "future broadcasts, it does not erase history.",
  idempotent: true,
  params: [
    {
      key: "liveStreamId",
      label: "Live Stream ID",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "confirm",
      label: "Yes, retire this stream",
      type: "boolean",
      required: true,
      default: false,
      hint: "The stream key stops working at once, so any encoder configured with it can no " +
        "longer broadcast. To end a broadcast in progress, use Complete instead.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Deleted" },
    { key: "liveStreamId", type: "string", label: "Live stream ID" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const liveStreamId = String(p.liveStreamId ?? "").trim();
    if (!liveStreamId) throw new Error("`liveStreamId` is required");
    if (p.confirm !== true) {
      throw new Error(
        `refusing to delete live stream ${liveStreamId} without \`confirm\` — its stream key ` +
          "stops working immediately. To end a broadcast in progress, use `live-stream-complete`",
      );
    }

    ctx.log("warn", "deleting a Mux live stream", { liveStreamId });
    await new MuxClient(ctx).request(
      `/video/v1/live-streams/${encodeURIComponent(liveStreamId)}`,
      { method: "DELETE" },
    );
    return { ok: true, liveStreamId };
  },
};

export default action;
