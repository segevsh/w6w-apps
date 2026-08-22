import type { ActionDefinition } from "@w6w/types";
import { CloudinaryClient, compact } from "../lib/client.ts";
import { RESOURCE_TYPE_PARAM } from "../lib/params.ts";

/**
 * `POST /{resource_type}/rename` — change an asset's public id.
 *
 * In a fixed-folder account the public id **is** the path, so renaming is also
 * how an asset is moved between folders — `products/hero` to `archive/hero` is
 * a rename. In a dynamic-folder account the two are independent and moving is
 * `asset-update`'s Asset Folder instead.
 *
 * **Every delivery URL that used the old public id breaks.** That is the whole
 * risk here: the id is in the URL, so renaming an asset that is live on a
 * website is a broken image unless something rewrites the references too.
 * `invalidate` flushes the CDN copies of the old id, which stops it serving a
 * stale success for hours after the change.
 *
 * `overwrite` decides what happens when the target id already exists: without
 * it the call fails, with it the existing asset is replaced and lost.
 */
const action: ActionDefinition = {
  key: "asset-rename",
  type: "perform",
  resource: "asset",
  title: "Rename or move asset",
  description:
    "Change an asset's public id — which, in a fixed-folder account, is also how it moves " +
    "folders. Every delivery URL using the old id breaks.",
  idempotent: true,
  params: [
    {
      key: "fromPublicId",
      label: "Current Public ID",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "toPublicId",
      label: "New Public ID",
      type: "string",
      required: true,
      default: "",
      hint: "Include the folder path in a fixed-folder account — `archive/hero` moves it.",
    },
    RESOURCE_TYPE_PARAM,
    {
      key: "overwrite",
      label: "Overwrite Existing",
      type: "boolean",
      default: false,
      hint: "If the new id is taken: off, the call fails; on, the existing asset is replaced " +
        "and lost.",
    },
    {
      key: "invalidate",
      label: "Invalidate CDN",
      type: "boolean",
      default: true,
      hint: "Flushes cached copies of the OLD id, which would otherwise keep being served.",
    },
    {
      key: "toType",
      label: "New Delivery Type",
      type: "select",
      default: "",
      advanced: true,
      options: [
        { value: "", label: "Unchanged" },
        { value: "upload", label: "Upload — public" },
        { value: "private", label: "Private" },
        { value: "authenticated", label: "Authenticated" },
      ],
      hint: "Renaming is also how an asset is made private after the fact.",
    },
  ],
  output: [
    { key: "public_id", type: "string", label: "New public ID" },
    { key: "secure_url", type: "string", label: "New delivery URL" },
    { key: "type", type: "string", label: "Delivery type" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const from = String(p.fromPublicId ?? "").trim();
    const to = String(p.toPublicId ?? "").trim();
    if (!from || !to) throw new Error("`fromPublicId` and `toPublicId` are both required");
    if (from === to) throw new Error("the new public id is the same as the old one");

    const resourceType = String(p.resourceType ?? "image");
    return await new CloudinaryClient(ctx).request(
      `/${encodeURIComponent(resourceType)}/rename`,
      {
        method: "POST",
        form: true,
        body: compact({
          from_public_id: from,
          to_public_id: to,
          overwrite: p.overwrite === true ? true : undefined,
          invalidate: p.invalidate !== false ? true : undefined,
          to_type: String(p.toType ?? "") || undefined,
        }),
      },
    );
  },
};

export default action;
