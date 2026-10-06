import type { ActionDefinition } from "@w6w/types";
import { compact, LINK_OUTPUT, ShortClient, type ShortLink, stripPassword } from "../lib/client.ts";

interface Input {
  originalURL: string;
  domain: string;
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
  folderId?: string;
  allowDuplicates?: boolean;
}

/**
 * POST /links
 *
 * Both `originalURL` and `domain` (a hostname you own, not an id) are required.
 * Vendor semantics worth knowing: with no `path`, re-posting an `originalURL`
 * that already exists returns the existing link instead of creating one; with a
 * `path` that is taken by a different destination the vendor answers 409.
 * Not idempotent, because a custom `path` on an existing destination does mint
 * a second link.
 */
const linkCreate: ActionDefinition<Input, ShortLink> = {
  key: "link-create",
  type: "perform",
  resource: "link",
  title: "Create Link",
  description: "Create a short link on one of your Short.io domains.",
  idempotent: false,
  params: [
    { key: "originalURL", label: "Destination URL", type: "string", required: true },
    {
      key: "domain",
      label: "Domain",
      type: "string",
      required: true,
      placeholder: "go.example.com",
      hint: "The hostname of a domain on the account (see List Domains).",
    },
    {
      key: "path",
      label: "Path (slug)",
      type: "string",
      hint: "Leave empty to let Short.io generate one with the domain's configured algorithm.",
    },
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
    { key: "folderId", label: "Folder ID", type: "string" },
    { key: "allowDuplicates", label: "Allow duplicates", type: "boolean" },
  ],
  output: LINK_OUTPUT,

  async execute(input, ctx) {
    const link = await new ShortClient(ctx).request<ShortLink>("/links", {
      method: "POST",
      body: compact({ ...input }),
    });
    return stripPassword(link);
  },
};

export default linkCreate;
