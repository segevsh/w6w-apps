import type { ActionDefinition } from "@w6w/types";
import { cfFetch } from "../lib/client.ts";

/**
 * Purge a zone's edge cache — either everything, or a specific list of URLs.
 * `POST /zones/{zone_id}/purge_cache` —
 * https://developers.cloudflare.com/api/resources/cache/methods/purge/
 *
 * Cloudflare also supports purge-by-tag/host/prefix (Enterprise-only "flex
 * purge"), which is out of scope here since it needs a plan this app cannot
 * verify at runtime — everything/files is what every plan tier supports.
 */
const action: ActionDefinition = {
  key: "cache-purge",
  type: "perform",
  resource: "cache",
  title: "Purge cache",
  description: "Purge everything, or purge a specific list of URLs, from a zone's edge cache",
  idempotent: true,
  params: [
    {
      key: "zoneId",
      label: "Zone ID",
      type: "string",
      required: true,
      default: "",
      hint: "The zone's ID",
    },
    {
      key: "purgeType",
      label: "Purge",
      type: "select",
      required: true,
      default: "everything",
      options: [
        { value: "everything", label: "Everything" },
        { value: "files", label: "Specific URLs" },
      ],
    },
    {
      key: "files",
      label: "URLs",
      type: "array",
      default: [],
      item: { type: "string", placeholder: "https://www.example.com/css/styles.css" },
      showIf: { field: "purgeType", equals: "files" },
      hint:
        "Fully-qualified URLs to purge. Must match the resource's URL exactly, including scheme.",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const zoneId = String(p.zoneId ?? "").trim();
    if (!zoneId) throw new Error("`zoneId` is required");

    const purgeType = String(p.purgeType ?? "everything");
    let body: Record<string, unknown>;

    if (purgeType === "everything") {
      body = { purge_everything: true };
    } else {
      const files = Array.isArray(p.files)
        ? p.files.map((f) => String(f).trim()).filter(Boolean)
        : [];
      if (files.length === 0) {
        throw new Error("`files` must contain at least one URL when purging specific URLs");
      }
      body = { files };
    }

    ctx.log("info", "purging Cloudflare cache", { zoneId, purgeType });

    const { result } = await cfFetch(ctx, `/zones/${encodeURIComponent(zoneId)}/purge_cache`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return result;
  },
};

export default action;
