import type { ActionDefinition } from "@w6w/types";
import { CloudinaryClient } from "../lib/client.ts";
import { DELIVERY_TYPE_PARAM, LIST_PARAMS, RESOURCE_TYPE_PARAM } from "../lib/params.ts";

/**
 * `GET /resources/{resource_type}` — the plain listing.
 *
 * Cheaper and dumber than `asset-search`: it filters by **public-id prefix**
 * and nothing else, and returns assets in reverse creation order. That is
 * enough for "everything in this folder" when folder and prefix line up, and
 * not enough for anything involving tags, size or dates — those are search's
 * job.
 *
 * The prefix is matched against the **public id**, which in a folder-organised
 * account starts with the folder path. In a *dynamic-folder* account (the newer
 * mode) the public id and the folder are independent, and then the prefix
 * filter and the folder are genuinely different things — `asset-search` with
 * `folder:` is the reliable way to ask.
 *
 * `tags`, `context` and `metadata` are **off by default** in the response, and
 * turning them on is what most workflows actually want.
 */
const action: ActionDefinition = {
  key: "asset-list",
  type: "read",
  resource: "asset",
  title: "List assets",
  description:
    "Assets by public-id prefix, newest first. Filtering by anything richer — tags, size, " +
    "dates — is Search's job.",
  params: [
    RESOURCE_TYPE_PARAM,
    DELIVERY_TYPE_PARAM,
    {
      key: "prefix",
      label: "Public ID Prefix",
      type: "string",
      default: "",
      placeholder: "products/",
      hint: "Matched against the public id. In a dynamic-folder account the public id and the " +
        "folder are independent — use Search with `folder:` there.",
    },
    {
      key: "tags",
      label: "Include Tags",
      type: "boolean",
      default: true,
      hint: "Cloudinary omits tags by default.",
    },
    {
      key: "context",
      label: "Include Context",
      type: "boolean",
      default: true,
    },
    {
      key: "metadata",
      label: "Include Structured Metadata",
      type: "boolean",
      default: false,
      advanced: true,
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "resources", type: "array", label: "Assets" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const resourceType = String(p.resourceType ?? "image");
    const type = String(p.type ?? "upload");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    const resources = await new CloudinaryClient(ctx).requestAll(
      `/resources/${encodeURIComponent(resourceType)}/${encodeURIComponent(type)}`,
      "resources",
      {
        query: {
          prefix: String(p.prefix ?? "") || undefined,
          tags: p.tags !== false,
          context: p.context !== false,
          metadata: p.metadata === true,
        },
      },
      returnAll ? Infinity : limit,
    );
    return { resources };
  },
};

export default action;
