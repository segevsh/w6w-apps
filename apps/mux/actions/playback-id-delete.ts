import type { ActionDefinition } from "@w6w/types";
import { MuxClient } from "../lib/client.ts";

/**
 * `DELETE /video/v1/assets/{id}/playback-ids/{playbackId}` — revoke access
 * without deleting the video.
 *
 * The right tool for "take this down". Removing a playback id stops every URL
 * built from it working, **immediately and permanently** — the id is never
 * reissued — while the asset, its renditions and every other playback id are
 * untouched.
 *
 * That is what makes one-id-per-audience worth doing: a leaked embed can be
 * revoked without breaking the marketing page, and a customer's access can end
 * without deleting content the business still owns.
 *
 * Existing viewers with the stream already loaded may finish playing what they
 * have buffered; new requests fail at once.
 */
const action: ActionDefinition = {
  key: "playback-id-delete",
  type: "perform",
  resource: "playback",
  title: "Revoke a playback ID",
  description:
    "Stop every URL built from one playback id working, permanently, without touching the " +
    "asset or its other playback ids.",
  idempotent: true,
  params: [
    {
      key: "assetId",
      label: "Asset ID",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "playbackId",
      label: "Playback ID",
      type: "string",
      required: true,
      default: "",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Revoked" },
    { key: "playbackId", type: "string", label: "Playback ID" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const assetId = String(p.assetId ?? "").trim();
    if (!assetId) throw new Error("`assetId` is required");
    const playbackId = String(p.playbackId ?? "").trim();
    if (!playbackId) throw new Error("`playbackId` is required");

    ctx.log("info", "revoking a Mux playback id", { assetId, playbackId });
    await new MuxClient(ctx).request(
      `/video/v1/assets/${encodeURIComponent(assetId)}/playback-ids/${
        encodeURIComponent(playbackId)
      }`,
      { method: "DELETE" },
    );
    return { ok: true, playbackId };
  },
};

export default action;
