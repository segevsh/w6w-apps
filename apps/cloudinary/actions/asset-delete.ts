import type { ActionDefinition } from "@w6w/types";
import { CloudinaryClient, csv } from "../lib/client.ts";
import { DELIVERY_TYPE_PARAM, RESOURCE_TYPE_PARAM } from "../lib/params.ts";

/**
 * `DELETE /resources/{resource_type}/{type}` — delete assets by id, by
 * public-id prefix, or all of them.
 *
 * The three selectors are mutually exclusive and only one of them is safe to
 * run without thinking:
 *
 *   - **by public id** — up to 100 per call, an explicit list.
 *   - **by prefix** — everything under a path. How many is unknown until it
 *     has happened.
 *   - **all** — every asset of that resource and delivery type in the account.
 *
 * The last two require the confirmation flag. Naming ids does not: the ids are
 * the statement of intent, and deleting an id twice is harmless.
 *
 * **Deletion is not immediately undoable unless the account has backups turned
 * on.** With them, `asset-restore` brings an asset back; without them, the
 * bytes are gone. That is an account setting this API cannot check, which is
 * why the confirmation text does not promise a way back.
 *
 * `invalidate` matters here too: deleting an asset does not flush CDN copies,
 * so the image keeps being served from the edge until the cache expires.
 */
const action: ActionDefinition = {
  key: "asset-delete",
  type: "perform",
  resource: "asset",
  title: "Delete assets",
  description:
    "Delete by public id (up to 100), by prefix, or everything of a type. The last two need an " +
    "explicit confirmation — neither can say in advance how much it removes.",
  idempotent: true,
  params: [
    RESOURCE_TYPE_PARAM,
    DELIVERY_TYPE_PARAM,
    {
      key: "publicIds",
      label: "Public IDs",
      type: "string",
      default: "",
      hint: "Comma-separated, up to 100 per call.",
    },
    {
      key: "prefix",
      label: "Public ID Prefix",
      type: "string",
      default: "",
      hint: "Deletes everything whose public id starts with this.",
    },
    {
      key: "all",
      label: "Delete All",
      type: "boolean",
      default: false,
      hint: "Every asset of this resource and delivery type in the account.",
    },
    {
      key: "invalidate",
      label: "Invalidate CDN",
      type: "boolean",
      default: true,
      hint: "Deleting does not flush the CDN on its own — the image keeps being served from the " +
        "edge until the cache expires.",
    },
    {
      key: "confirm",
      label: "Yes, I know how much this deletes",
      type: "boolean",
      default: false,
      hint: "Required for a prefix or Delete All. Recovery needs the account's backup setting " +
        "to have been on BEFORE the delete.",
    },
  ],
  output: [
    { key: "deleted", type: "object", label: "Per-asset result" },
    { key: "deleted_counts", type: "object", label: "Counts" },
    { key: "partial", type: "boolean", label: "More remained than one call could delete" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const publicIds = csv(p.publicIds);
    const prefix = String(p.prefix ?? "").trim();
    const all = p.all === true;

    const chosen = [publicIds && "publicIds", prefix && "prefix", all && "all"]
      .filter(Boolean) as string[];
    if (chosen.length === 0) {
      throw new Error("give `publicIds`, a `prefix`, or `all` — nothing was selected to delete");
    }
    if (chosen.length > 1) {
      throw new Error(
        `give exactly one of \`publicIds\`, \`prefix\` or \`all\` (got ${chosen.join(" + ")})`,
      );
    }
    if (publicIds && publicIds.length > 100) {
      throw new Error(
        `Cloudinary deletes at most 100 public ids per call; got ${publicIds.length}`,
      );
    }
    if (!publicIds && p.confirm !== true) {
      throw new Error(
        `refusing a ${all ? "delete-all" : "prefix"} delete without \`confirm\` — it cannot say ` +
          "how many assets it will remove, and recovery depends on backups having been enabled " +
          "beforehand",
      );
    }

    const resourceType = String(p.resourceType ?? "image");
    const type = String(p.type ?? "upload");
    ctx.log(publicIds ? "info" : "warn", "deleting Cloudinary assets", {
      mode: chosen[0],
      count: publicIds?.length,
    });

    return await new CloudinaryClient(ctx).request(
      `/resources/${encodeURIComponent(resourceType)}/${encodeURIComponent(type)}`,
      {
        method: "DELETE",
        // The request builder drops undefined and empty values on its own.
        query: {
          public_ids: publicIds,
          prefix: prefix || undefined,
          all: all ? true : undefined,
          invalidate: p.invalidate !== false,
        },
      },
    );
  },
};

export default action;
