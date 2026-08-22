import type { ActionDefinition } from "@w6w/types";
import { MuxClient } from "../lib/client.ts";

/**
 * `DELETE /video/v1/assets/{id}` — remove a video permanently.
 *
 * There is no recycle bin and no undo: the asset, its renditions and its
 * playback ids are gone, and every URL built from those ids stops working
 * immediately. If the original file is not still somewhere else, the video is
 * simply lost — Mux stores a mezzanine but deleting the asset deletes that too.
 *
 * Storage is metered per minute of video stored, so deleting is also how a
 * media workflow controls cost, which makes it a routine operation on a
 * schedule. That is precisely why it takes a confirmation: a retention job
 * pointed at the wrong list deletes real content, quietly and quickly.
 *
 * Deleting an asset that is already gone answers `404` rather than succeeding,
 * so a retry after a partial failure needs to tolerate that.
 */
const action: ActionDefinition = {
  key: "asset-delete",
  type: "perform",
  resource: "asset",
  title: "Delete asset",
  description:
    "Permanently delete a video and every URL built from its playback ids. This is also how " +
    "storage cost is controlled, which is why it needs confirming.",
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
      key: "confirm",
      label: "Yes, delete this video permanently",
      type: "boolean",
      required: true,
      default: false,
      hint: "The renditions and the stored master go too. If the source file is not elsewhere, " +
        "the video is lost.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Deleted" },
    { key: "assetId", type: "string", label: "Asset ID" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const assetId = String(p.assetId ?? "").trim();
    if (!assetId) throw new Error("`assetId` is required");
    if (p.confirm !== true) {
      throw new Error(
        `refusing to delete asset ${assetId} without \`confirm\` — the renditions and the ` +
          "stored master go with it, and every playback URL stops working",
      );
    }

    ctx.log("warn", "deleting a Mux asset", { assetId });
    await new MuxClient(ctx).request(`/video/v1/assets/${encodeURIComponent(assetId)}`, {
      method: "DELETE",
    });
    return { ok: true, assetId };
  },
};

export default action;
