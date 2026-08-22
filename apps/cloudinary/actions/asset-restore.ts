import type { ActionDefinition } from "@w6w/types";
import { CloudinaryClient, csv } from "../lib/client.ts";
import { DELIVERY_TYPE_PARAM, RESOURCE_TYPE_PARAM } from "../lib/params.ts";

/**
 * `POST /resources/{resource_type}/{type}/restore` — bring deleted assets back.
 *
 * **This only works if the account had backups enabled before the delete.**
 * Cloudinary's backup setting is per product environment and off by default;
 * with it on, every version of an asset is kept and a delete is reversible,
 * and without it there is nothing to restore from. The API cannot tell you
 * which situation you are in until you try — a restore against an unbacked
 * account returns an empty result rather than an error, which is the least
 * helpful possible answer and worth knowing in advance.
 *
 * With `versions`, a specific version of each asset is restored rather than the
 * most recent — which is also how an *overwritten* asset is rolled back, not
 * just a deleted one.
 */
const action: ActionDefinition = {
  key: "asset-restore",
  type: "perform",
  resource: "asset",
  title: "Restore deleted assets",
  description:
    "Bring back deleted (or overwritten) assets — only if the account had backups enabled " +
    "BEFORE the delete. Without them the response is empty rather than an error.",
  idempotent: true,
  params: [
    {
      key: "publicIds",
      label: "Public IDs",
      type: "string",
      required: true,
      default: "",
      hint: "Comma-separated, up to 100.",
    },
    RESOURCE_TYPE_PARAM,
    DELIVERY_TYPE_PARAM,
    {
      key: "versions",
      label: "Versions",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated version ids, positionally matched to the public ids. Omitted, the " +
        "most recent backup of each is restored — this is also how an overwrite is rolled back.",
    },
  ],
  output: [
    { key: "restored", type: "object", label: "Restored assets by public id" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const publicIds = csv(p.publicIds);
    if (!publicIds) throw new Error("`publicIds` is required");
    const versions = csv(p.versions);
    if (versions && versions.length !== publicIds.length) {
      throw new Error(
        `\`versions\` is matched positionally to \`publicIds\` — got ${versions.length} versions ` +
          `for ${publicIds.length} ids`,
      );
    }

    const resourceType = String(p.resourceType ?? "image");
    const type = String(p.type ?? "upload");
    const restored = await new CloudinaryClient(ctx).request<Record<string, unknown>>(
      `/resources/${encodeURIComponent(resourceType)}/${encodeURIComponent(type)}/restore`,
      { method: "POST", form: true, body: { public_ids: publicIds, versions } },
    );

    if (restored && Object.keys(restored).length === 0) {
      // The unhelpful answer, made helpful.
      ctx.log(
        "warn",
        "Cloudinary restored nothing — this account probably had backups disabled when the " +
          "assets were deleted",
        { publicIds },
      );
    }
    return { restored };
  },
};

export default action;
