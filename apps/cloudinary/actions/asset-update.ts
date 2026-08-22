import type { ActionDefinition } from "@w6w/types";
import { CloudinaryClient, compact, contextString, csv } from "../lib/client.ts";
import { encodePublicId } from "./asset-get.ts";
import { DELIVERY_TYPE_PARAM, RESOURCE_TYPE_PARAM } from "../lib/params.ts";

/**
 * `POST /resources/{resource_type}/{type}/{public_id}` — edit an asset's
 * metadata without re-uploading it.
 *
 * The distinction that matters: **`tags` here replaces the whole set**, while
 * `asset-tag` adds and removes individually. Sending one tag to an asset that
 * has three removes the other two, and the call succeeds. This action therefore
 * says so on the param and points at the additive alternative, exactly as this
 * pack's `front` app does for Front's conversation tags.
 *
 * `context` is the free-form key/value store (`alt`, `caption`, anything);
 * `metadata` is the *structured* one, whose fields are defined account-wide
 * first and validated on write. Both are sent as Cloudinary's pipe-joined
 * `key=value` string rather than as JSON — a JSON object is accepted and stored
 * as one meaningless value.
 */
const action: ActionDefinition = {
  key: "asset-update",
  type: "perform",
  resource: "asset",
  title: "Update asset",
  description:
    "Change an asset's tags, context, structured metadata or moderation status. Tags REPLACE " +
    "the whole set — Manage Tags is the additive version.",
  idempotent: true,
  params: [
    {
      key: "publicId",
      label: "Public ID",
      type: "string",
      required: true,
      default: "",
    },
    RESOURCE_TYPE_PARAM,
    DELIVERY_TYPE_PARAM,
    {
      key: "tags",
      label: "Tags",
      type: "string",
      default: "",
      hint: "⚠️ Comma-separated, and REPLACES every existing tag. Use Manage Tags to add or " +
        "remove without touching the rest.",
    },
    {
      key: "context",
      label: "Context",
      type: "json",
      default: "",
      hint: 'Free-form key/value pairs, e.g. `{"alt":"Hero shot"}`.',
    },
    {
      key: "metadata",
      label: "Structured Metadata",
      type: "json",
      default: "",
      hint: "Fields defined account-wide first — see List Metadata Fields. Validated on write, " +
        "unlike context.",
    },
    {
      key: "moderationStatus",
      label: "Moderation Status",
      type: "select",
      default: "",
      advanced: true,
      options: [
        { value: "", label: "Leave unchanged" },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" },
      ],
      hint: "Only meaningful on an asset uploaded with moderation enabled.",
    },
    {
      key: "assetFolder",
      label: "Asset Folder",
      type: "string",
      default: "",
      advanced: true,
      hint: "Dynamic-folder accounts only — moves the asset without changing its public id.",
    },
  ],
  output: [
    { key: "public_id", type: "string", label: "Public ID" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "context", type: "object", label: "Context" },
    { key: "metadata", type: "object", label: "Structured metadata" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const publicId = String(p.publicId ?? "").trim();
    if (!publicId) throw new Error("`publicId` is required");
    const resourceType = String(p.resourceType ?? "image");
    const type = String(p.type ?? "upload");

    const body = compact({
      tags: csv(p.tags)?.join(","),
      context: contextString(p.context, "context"),
      metadata: contextString(p.metadata, "metadata"),
      moderation_status: String(p.moderationStatus ?? "") || undefined,
      asset_folder: p.assetFolder,
    });
    if (Object.keys(body).length === 0) throw new Error("nothing to update");

    return await new CloudinaryClient(ctx).request(
      `/resources/${encodeURIComponent(resourceType)}/${encodeURIComponent(type)}/${
        encodePublicId(publicId)
      }`,
      { method: "POST", form: true, body },
    );
  },
};

export default action;
