import type { ActionDefinition } from "@w6w/types";
import { CloudinaryClient } from "../lib/client.ts";
import { DELIVERY_TYPE_PARAM, RESOURCE_TYPE_PARAM } from "../lib/params.ts";

/**
 * `GET /resources/{resource_type}/{type}/{public_id}` — one asset, read
 * directly.
 *
 * Worth preferring over a one-result search for two reasons: it is **strongly
 * consistent** (the search index is not, so an asset uploaded a moment ago may
 * be missing from search results while this returns it), and it can return the
 * things search will not — the full `derived` list of generated renditions, the
 * extracted `image_metadata`/EXIF, and colour analysis.
 *
 * **The public id must be URL-encoded with its slashes intact.** A public id in
 * a folder is `products/hero-shot`, and Cloudinary expects those slashes as
 * path separators — so the id is encoded segment by segment here, which is what
 * keeps a `?` or a space in a filename from breaking the request while leaving
 * the folder structure alone.
 */
const action: ActionDefinition = {
  key: "asset-get",
  type: "read",
  resource: "asset",
  title: "Get asset",
  description:
    "One asset in full — including its derived renditions and extracted metadata, and unlike " +
    "search, immediately after upload.",
  params: [
    {
      key: "publicId",
      label: "Public ID",
      type: "string",
      required: true,
      default: "",
      placeholder: "products/hero-shot",
      hint: "Without the file extension. Folder slashes are part of the id.",
    },
    RESOURCE_TYPE_PARAM,
    DELIVERY_TYPE_PARAM,
    {
      key: "colors",
      label: "Include Colour Analysis",
      type: "boolean",
      default: false,
      advanced: true,
    },
    {
      key: "imageMetadata",
      label: "Include EXIF / Image Metadata",
      type: "boolean",
      default: false,
      advanced: true,
    },
    {
      key: "derived",
      label: "Include Derived Renditions",
      type: "boolean",
      default: true,
      advanced: true,
      hint: "The transformations already generated from this asset — each one is stored and " +
        "counts against the plan.",
    },
  ],
  output: [
    { key: "public_id", type: "string", label: "Public ID" },
    { key: "secure_url", type: "string", label: "Delivery URL" },
    { key: "format", type: "string", label: "Format" },
    { key: "width", type: "number", label: "Width" },
    { key: "height", type: "number", label: "Height" },
    { key: "bytes", type: "number", label: "Bytes" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "context", type: "object", label: "Context" },
    { key: "derived", type: "array", label: "Derived renditions" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const publicId = String(p.publicId ?? "").trim();
    if (!publicId) throw new Error("`publicId` is required");
    const resourceType = String(p.resourceType ?? "image");
    const type = String(p.type ?? "upload");

    return await new CloudinaryClient(ctx).request(
      `/resources/${encodeURIComponent(resourceType)}/${encodeURIComponent(type)}/${
        encodePublicId(publicId)
      }`,
      {
        query: {
          colors: p.colors === true,
          image_metadata: p.imageMetadata === true,
          // Cloudinary's flag is spelled `exif` on some plans and
          // `image_metadata` on others; both are accepted and ignored when
          // unsupported.
          derived: p.derived !== false,
        },
      },
    );
  },
};

/** Encode each segment, keeping the folder slashes that structure the id. */
export function encodePublicId(publicId: string): string {
  return publicId.split("/").map(encodeURIComponent).join("/");
}

export default action;
