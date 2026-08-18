import type { ActionDefinition } from "@w6w/types";
import { compact, MuxClient, PLAYBACK_POLICIES } from "../lib/client.ts";
import { PASSTHROUGH_PARAM } from "../lib/params.ts";

/**
 * `POST /video/v1/live-streams` — a destination for somebody to broadcast to.
 *
 * The response carries a **`stream_key`**, and that key is the credential: it
 * is what an encoder (OBS, a hardware unit, a phone app) authenticates with,
 * and anyone holding it can broadcast *as* this stream to its audience. It
 * should be handed to the broadcaster over a channel that would be acceptable
 * for a password, and never logged — this action logs the stream id and not the
 * key.
 *
 * ## The recording is a separate object
 *
 * With `latency_mode` and recording enabled, each broadcast becomes an **asset**
 * when the stream ends, discoverable via `asset-list` filtered by
 * `live_stream_id`. So a live stream is a long-lived container and its
 * recordings accumulate under it — deleting the stream is not the same as
 * deleting them.
 *
 * ## Reconnect window
 *
 * `reconnect_window` is how long Mux waits, after the encoder drops, before
 * declaring the stream over and cutting the recording. Too short and a flaky
 * connection ends the broadcast; too long and viewers stare at a frozen frame.
 */
const action: ActionDefinition = {
  key: "live-stream-create",
  type: "perform",
  resource: "live",
  title: "Create a live stream",
  description:
    "A destination for an encoder to broadcast to. Its `stream_key` is a credential — anyone " +
    "holding it can broadcast as this stream.",
  idempotent: false,
  params: [
    {
      key: "playbackPolicy",
      label: "Playback Policy",
      type: "select",
      default: "public",
      options: PLAYBACK_POLICIES,
    },
    {
      key: "latencyMode",
      label: "Latency Mode",
      type: "select",
      default: "low",
      options: [
        { value: "standard", label: "Standard — most compatible" },
        { value: "low", label: "Low — a few seconds behind" },
        { value: "reduced", label: "Reduced" },
      ],
      hint: "Lower latency trades some compatibility and resilience for immediacy.",
    },
    {
      key: "reconnectWindow",
      label: "Reconnect Window (seconds)",
      type: "number",
      default: 60,
      hint: "How long Mux waits after the encoder drops before ending the stream and closing " +
        "the recording. Too short ends a broadcast on a flaky connection.",
    },
    {
      key: "record",
      label: "Record Broadcasts",
      type: "boolean",
      default: true,
      hint: "Each broadcast becomes an asset when it ends, found via List Assets filtered by " +
        "this stream.",
    },
    PASSTHROUGH_PARAM,
  ],
  output: [
    { key: "data", type: "object", label: "Live stream (including its stream key)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const reconnect = Number(p.reconnectWindow ?? 60);

    const body = await new MuxClient(ctx).request<{ data?: { id?: string } }>(
      "/video/v1/live-streams",
      {
        method: "POST",
        body: compact({
          playback_policies: [String(p.playbackPolicy ?? "public")],
          latency_mode: String(p.latencyMode ?? "low"),
          reconnect_window: Number.isFinite(reconnect) ? reconnect : undefined,
          new_asset_settings: p.record === false ? undefined : compact({
            playback_policies: [String(p.playbackPolicy ?? "public")],
            passthrough: p.passthrough,
          }),
          passthrough: p.passthrough,
        }),
      },
    );
    // The stream key is a credential — the id is logged, the key is not.
    ctx.log("info", "created a Mux live stream", { id: body?.data?.id });
    return body;
  },
};

export default action;
