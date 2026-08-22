import type { ActionDefinition } from "@w6w/types";
import { CloudinaryClient, compact, contextString, csv } from "../lib/client.ts";
import { DELIVERY_TYPE_PARAM, RESOURCE_TYPE_PARAM } from "../lib/params.ts";

/**
 * `POST /{resource_type}/explicit` — apply work to an asset that is already
 * uploaded.
 *
 * The awkward name hides the useful operation: it re-runs the upload pipeline
 * over an existing asset without re-uploading the bytes. That is how you
 *
 *   - **pre-generate transformations** for an asset that was uploaded without
 *     them (`eager`), so the first visitor does not pay for the render;
 *   - **run add-on analysis** after the fact — auto-tagging, moderation, OCR,
 *     background removal — on a library that predates the decision to use it;
 *   - **re-derive** renditions after an eager transformation definition
 *     changed.
 *
 * `type` is **required** by Cloudinary here and easy to get wrong: an asset
 * uploaded normally is `upload`, and passing the default when the asset is
 * `private` finds nothing and reports it as missing.
 *
 * Eager work is billed like any other transformation, and asking for it
 * synchronously on a large asset can time the request out — `eager_async` is
 * the answer, and the result then arrives by notification rather than in the
 * response.
 */
const action: ActionDefinition = {
  key: "asset-explicit",
  type: "perform",
  resource: "asset",
  title: "Apply transformations or analysis to an existing asset",
  description: "Re-run the upload pipeline over an asset already in the library — pre-generate " +
    "transformations, or run auto-tagging, moderation and OCR after the fact.",
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
      key: "eager",
      label: "Eager Transformations",
      type: "string",
      default: "",
      placeholder: "w_400,c_fill|w_1200,q_auto,f_auto",
      hint: "Pipe-separated transformation strings to generate now.",
    },
    {
      key: "eagerAsync",
      label: "Eager Async",
      type: "boolean",
      default: true,
      hint: "On by default: generating several renditions synchronously can time the request " +
        "out on a large asset.",
    },
    {
      key: "categorization",
      label: "Auto-tagging Add-on",
      type: "string",
      default: "",
      advanced: true,
      placeholder: "google_tagging",
      hint: "Requires the add-on to be enabled on the account.",
    },
    {
      key: "autoTagging",
      label: "Auto-tagging Confidence",
      type: "number",
      default: 0,
      advanced: true,
      hint: "0–1. Tags whose confidence is at least this are applied automatically. Needs a " +
        "categorization add-on.",
    },
    {
      key: "ocr",
      label: "OCR Add-on",
      type: "string",
      default: "",
      advanced: true,
      placeholder: "adv_ocr",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated. Replaces the asset's tags, as on upload.",
    },
    {
      key: "context",
      label: "Context",
      type: "json",
      default: "",
      advanced: true,
    },
  ],
  output: [
    { key: "public_id", type: "string", label: "Public ID" },
    { key: "eager", type: "array", label: "Generated renditions" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "info", type: "object", label: "Add-on results" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const publicId = String(p.publicId ?? "").trim();
    if (!publicId) throw new Error("`publicId` is required");

    const autoTagging = Number(p.autoTagging ?? 0);
    // `type` and `eager_async` are always present, so the body's size says
    // nothing about whether there is any work to do.
    const hasWork = [p.eager, p.categorization, p.ocr, p.tags, p.context]
      .some((v) => v !== undefined && v !== null && String(v).trim() !== "") || autoTagging > 0;
    if (!hasWork) {
      throw new Error(
        "nothing to do — give at least one of `eager`, `categorization`, `ocr`, `tags` or " +
          "`context`",
      );
    }

    const body = compact({
      public_id: publicId,
      // Cloudinary requires `type` on this route; it is not optional the way it
      // is elsewhere.
      type: String(p.type ?? "upload"),
      eager: String(p.eager ?? "") || undefined,
      eager_async: p.eagerAsync !== false ? true : undefined,
      categorization: p.categorization,
      auto_tagging: autoTagging > 0 ? autoTagging : undefined,
      ocr: p.ocr,
      tags: csv(p.tags)?.join(","),
      context: contextString(p.context, "context"),
    });
    const resourceType = String(p.resourceType ?? "image");
    return await new CloudinaryClient(ctx).request(
      `/${encodeURIComponent(resourceType)}/explicit`,
      { method: "POST", form: true, body },
    );
  },
};

export default action;
