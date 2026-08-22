import type { ActionDefinition } from "@w6w/types";
import { MuxClient } from "../lib/client.ts";

/**
 * `GET /video/v1/assets/{id}` — one asset, and whether it can be played yet.
 *
 * **`status` is the field to read.** `preparing` means Mux is still working;
 * `ready` means it can be played; `errored` means it never will be, and
 * `errors` says why — almost always that the input URL was unreachable or was
 * not a video Mux could decode.
 *
 * This is the polling half of asset creation, for workflows that cannot receive
 * the `video.asset.ready` webhook. Polling costs a call each time, so a webhook
 * is better where one is possible.
 *
 * `playback_ids` is what a viewer actually needs — an asset with none exists and
 * cannot be watched by anybody, which is a legitimate state (an archive) and a
 * common surprise.
 */
const action: ActionDefinition = {
  key: "asset-get",
  type: "read",
  resource: "asset",
  title: "Get asset",
  description:
    "One asset — most importantly whether it is still `preparing`, is `ready` to play, or " +
    "`errored` with the reason.",
  params: [
    {
      key: "assetId",
      label: "Asset ID",
      type: "string",
      required: true,
      default: "",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Asset" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const assetId = String(p.assetId ?? "").trim();
    if (!assetId) throw new Error("`assetId` is required");

    const body = await new MuxClient(ctx).request<{ data?: { status?: string; errors?: unknown } }>(
      `/video/v1/assets/${encodeURIComponent(assetId)}`,
    );
    if (body?.data?.status === "errored") {
      ctx.log("warn", "this Mux asset failed to process", { errors: body.data.errors });
    }
    return body;
  },
};

export default action;
