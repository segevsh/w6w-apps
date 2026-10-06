import type { ActionDefinition } from "@w6w/types";
import { jsonApiBody, WorkDriveClient } from "../lib/client.ts";
import { resourceId } from "../lib/params.ts";

interface Input {
  resourceId: string;
  linkName: string;
  expirationDate?: string;
  downloadLimit?: number;
}

/**
 * `POST /links` — the "external share download link" form: `allow_download` must be `true` and
 * `request_user_data` must be `false` (both documented as fixed values on that page).
 */
const shareLinkCreate: ActionDefinition<Input> = {
  key: "share-link-create",
  type: "perform",
  resource: "link",
  title: "Create Download Link",
  description: "Create an external download link for a file or folder.",
  idempotent: false,
  params: [
    resourceId,
    { key: "linkName", label: "Link Name", type: "string", required: true },
    {
      key: "expirationDate",
      label: "Expiration",
      type: "string",
      placeholder: "2026-12-31 23:59:59",
      hint: "yyyy-mm-dd hh:mm:ss (24h). Empty = never expires.",
    },
    {
      key: "downloadLimit",
      label: "Download Limit",
      type: "number",
      validation: { min: 1, integer: true },
      hint: "Maximum downloads allowed per user.",
    },
  ],
  output: [{
    key: "item",
    type: "object",
    label: "Created link (JSON:API `data`; `attributes.link`)",
  }],

  async execute(input, ctx) {
    const body = await new WorkDriveClient(ctx).request("POST", "/links", {
      body: jsonApiBody("links", {
        resource_id: input.resourceId,
        link_name: input.linkName,
        request_user_data: false,
        allow_download: true,
        expiration_date: input.expirationDate,
        download_link: input.downloadLimit ? { download_limit: input.downloadLimit } : undefined,
      }),
    });
    return { item: body.data ?? null };
  },
};

export default shareLinkCreate;
