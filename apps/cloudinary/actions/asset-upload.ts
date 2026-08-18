import type { ActionDefinition } from "@w6w/types";
import { CloudinaryClient, compact, contextString, csv } from "../lib/client.ts";
import { RESOURCE_TYPE_PARAM } from "../lib/params.ts";

/**
 * `POST /{resource_type}/upload` — the Upload API, reached with the same Basic
 * credential as everything else.
 *
 * ## What can be uploaded from a sandbox
 *
 * Cloudinary's `file` parameter takes a **remote URL**, a base64 data URI, an
 * S3/GCS URI, or multipart bytes. The first two are what an App can produce —
 * bytes it never had cannot be attached — and both are supported here. Handing
 * Cloudinary a URL is also the better pattern: the fetch happens between two
 * datacentres rather than through the workflow.
 *
 * ## `public_id` decides whether this is idempotent
 *
 * With a `public_id` and **Overwrite** on, uploading the same source twice
 * leaves one asset — the second call replaces the first. Without a `public_id`,
 * Cloudinary invents a random one and every call creates another copy, which is
 * how libraries quietly fill with duplicates of the same image. The action
 * declares itself **not** idempotent because that is the default behaviour, and
 * says so on the param.
 *
 * ## Overwrite has a companion nobody reads
 *
 * `overwrite` replaces the asset. It does **not** flush the CDN copies of the
 * old bytes — `invalidate` does, and it is a separate flag. An upload that
 * overwrites without invalidating serves the old image from the edge for as
 * long as the cache says to, which reads as "the upload did not work".
 *
 * ## `eager` costs time now to save it later
 *
 * Eager transformations are generated at upload rather than on first request.
 * For a hero image that is worth it; for forty variants it makes the upload
 * slow, and `eager_async` is the answer.
 */
const action: ActionDefinition = {
  key: "asset-upload",
  type: "perform",
  resource: "asset",
  title: "Upload asset",
  description:
    "Upload from a remote URL or a data URI. Without a public id Cloudinary invents one, so " +
    "repeated runs create duplicates rather than replacing.",
  idempotent: false,
  params: [
    {
      key: "file",
      label: "File",
      type: "string",
      required: true,
      default: "",
      placeholder: "https://example.com/photo.jpg",
      hint: "A remote URL Cloudinary fetches, or a `data:` URI. Raw bytes cannot be attached " +
        "from a workflow.",
    },
    RESOURCE_TYPE_PARAM,
    {
      key: "publicId",
      label: "Public ID",
      type: "string",
      default: "",
      placeholder: "products/hero-shot",
      hint: "⚠️ Without this, Cloudinary invents a random id and every run creates ANOTHER " +
        "copy. With it, plus Overwrite, a re-run replaces.",
    },
    {
      key: "folder",
      label: "Folder",
      type: "string",
      default: "",
      hint: "Created if it does not exist.",
    },
    {
      key: "overwrite",
      label: "Overwrite",
      type: "boolean",
      default: false,
      hint: "Replace an existing asset with the same public id.",
    },
    {
      key: "invalidate",
      label: "Invalidate CDN",
      type: "boolean",
      default: false,
      hint: "Overwriting does NOT flush the CDN on its own. Without this, the old bytes keep " +
        "being served from the edge — which reads as 'the upload did not work'.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      default: "",
      hint: "Comma-separated.",
    },
    {
      key: "context",
      label: "Context",
      type: "json",
      default: "",
      hint: 'Key/value pairs, e.g. `{"alt":"Hero shot"}`. Sent as Cloudinary\'s pipe-joined ' +
        "`key=value` string, not as JSON.",
    },
    {
      key: "eager",
      label: "Eager Transformations",
      type: "string",
      default: "",
      advanced: true,
      placeholder: "w_400,c_fill|w_1200,q_auto",
      hint: "Pipe-separated transformation strings, generated at upload instead of on first " +
        "request. Slows the upload; use Eager Async for more than a couple.",
    },
    {
      key: "eagerAsync",
      label: "Eager Async",
      type: "boolean",
      default: false,
      advanced: true,
    },
    {
      key: "uploadPreset",
      label: "Upload Preset",
      type: "string",
      default: "",
      advanced: true,
      hint: "Applies a preset's stored settings — incoming transformations, moderation, " +
        "auto-tagging.",
    },
  ],
  output: [
    { key: "public_id", type: "string", label: "Public ID" },
    { key: "secure_url", type: "string", label: "Delivery URL" },
    { key: "version", type: "number", label: "Version" },
    { key: "format", type: "string", label: "Format" },
    { key: "width", type: "number", label: "Width" },
    { key: "height", type: "number", label: "Height" },
    { key: "bytes", type: "number", label: "Bytes" },
    { key: "eager", type: "array", label: "Eager renditions" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const file = String(p.file ?? "").trim();
    if (!file) throw new Error("`file` is required — a remote URL or a data: URI");
    const resourceType = String(p.resourceType ?? "image");

    if (p.overwrite === true && p.invalidate !== true) {
      // Not an error — just the most common surprise in this API.
      ctx.log(
        "warn",
        "overwriting without invalidate: the CDN will keep serving the old bytes",
        { publicId: p.publicId },
      );
    }

    ctx.log("info", "uploading to Cloudinary", { resourceType, publicId: p.publicId });

    return await new CloudinaryClient(ctx).request(
      `/${encodeURIComponent(resourceType)}/upload`,
      {
        method: "POST",
        form: true,
        body: compact({
          file,
          public_id: p.publicId,
          folder: p.folder,
          overwrite: p.overwrite === true ? true : undefined,
          invalidate: p.invalidate === true ? true : undefined,
          tags: csv(p.tags)?.join(","),
          context: contextString(p.context, "context"),
          eager: String(p.eager ?? "") || undefined,
          eager_async: p.eagerAsync === true ? true : undefined,
          upload_preset: p.uploadPreset,
        }),
      },
    );
  },
};

export default action;
