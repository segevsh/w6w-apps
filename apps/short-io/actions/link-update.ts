import type { ActionDefinition } from "@w6w/types";
import { compact, LINK_OUTPUT, ShortClient, type ShortLink, stripPassword } from "../lib/client.ts";

interface Input {
  linkId: string;
  originalURL?: string;
  path?: string;
  title?: string;
  tags?: string[];
  cloaking?: boolean;
  password?: string;
  redirectType?: number;
  expiresAt?: string;
  expiredURL?: string;
  clicksLimit?: number;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  androidURL?: string;
  iphoneURL?: string;
}

/**
 * POST /links/{linkId} — Short.io updates with **POST**, not PUT or PATCH. Only
 * the fields supplied are sent. Idempotent: re-applying the same values
 * converges on the same state.
 */
const linkUpdate: ActionDefinition<Input, ShortLink> = {
  key: "link-update",
  type: "perform",
  resource: "link",
  title: "Update Link",
  description: "Change the destination, slug, title, tags or settings of an existing link.",
  idempotent: true,
  params: [
    {
      key: "linkId",
      label: "Link ID",
      type: "string",
      required: true,
      placeholder: "lnk_abc123_def456",
      hint: "The `idString` returned by Create Link, Get Link or List Links.",
    },
    { key: "originalURL", label: "Destination URL", type: "string" },
    { key: "path", label: "Path (slug)", type: "string" },
    { key: "title", label: "Title", type: "string" },
    { key: "tags", label: "Tags", type: "array", item: { type: "string" } },
    { key: "cloaking", label: "Cloaking", type: "boolean" },
    { key: "password", label: "Password", type: "secret" },
    {
      key: "redirectType",
      label: "Redirect type",
      type: "number",
      validation: { enum: [301, 302, 307, 308] },
    },
    { key: "expiresAt", label: "Expires at", type: "string", hint: "ISO 8601 date-time." },
    { key: "expiredURL", label: "Expired URL", type: "string" },
    { key: "clicksLimit", label: "Clicks limit", type: "number", validation: { integer: true } },
    { key: "utmSource", label: "utm_source", type: "string" },
    { key: "utmMedium", label: "utm_medium", type: "string" },
    { key: "utmCampaign", label: "utm_campaign", type: "string" },
    { key: "utmTerm", label: "utm_term", type: "string" },
    { key: "utmContent", label: "utm_content", type: "string" },
    { key: "androidURL", label: "Android URL", type: "string" },
    { key: "iphoneURL", label: "iPhone URL", type: "string" },
  ],
  output: LINK_OUTPUT,

  async execute(input, ctx) {
    const { linkId, ...fields } = input;
    const link = await new ShortClient(ctx).request<ShortLink>(
      `/links/${encodeURIComponent(linkId)}`,
      { method: "POST", body: compact(fields) },
    );
    return stripPassword(link);
  },
};

export default linkUpdate;
