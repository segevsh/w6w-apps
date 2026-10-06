import type { Param } from "@w6w/types";
import { compact, jsonValue, strList } from "./client.ts";

/** Fields every link write accepts, as the form sees them. */
export interface LinkFields {
  url?: string;
  domain?: string;
  key?: string;
  externalId?: string | null;
  tenantId?: string | null;
  trackConversion?: boolean;
  archived?: boolean;
  tagIds?: string[] | string;
  tagNames?: string[] | string;
  folderId?: string | null;
  comments?: string | null;
  expiresAt?: string | null;
  expiredUrl?: string | null;
  password?: string | null;
  proxy?: boolean;
  title?: string | null;
  description?: string | null;
  image?: string | null;
  video?: string | null;
  rewrite?: boolean;
  ios?: string | null;
  android?: string | null;
  geo?: unknown;
  doIndex?: boolean;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  ref?: string | null;
}

const str = (key: string, label: string, hint?: string, extra: Partial<Param> = {}): Param => ({
  key,
  label,
  type: "string",
  ...(hint ? { hint } : {}),
  ...extra,
});
const bool = (key: string, label: string, hint?: string): Param => ({
  key,
  label,
  type: "boolean",
  ...(hint ? { hint } : {}),
});
const tags = (key: string, label: string, hint: string): Param => ({
  key,
  label,
  type: "array",
  item: { type: "string" },
  hint,
});

/** The link attributes shared by create, update, upsert and bulk update, in form order. */
export const LINK_FIELD_PARAMS: Param[] = [
  str(
    "domain",
    "Domain",
    "Domain without protocol. Defaults to the workspace's primary domain (or dub.sh).",
    { validation: { maxLength: 190 } },
  ),
  str("key", "Short link slug", "Defaults to a random 7-character slug.", {
    validation: { maxLength: 190 },
  }),
  str(
    "externalId",
    "External ID",
    "The link's ID in your own system; unique per workspace. Pass an empty string to remove it.",
    { validation: { maxLength: 255 } },
  ),
  str(
    "tenantId",
    "Tenant ID",
    "The tenant that created the link in your system. Pass an empty string to remove it.",
    { validation: { maxLength: 255 } },
  ),
  tags("tagIds", "Tag IDs", "IDs of existing tags to assign."),
  tags("tagNames", "Tag names", "Names of tags to assign (case insensitive)."),
  str("folderId", "Folder ID", "ID of an existing folder to put the link in."),
  str("comments", "Comments"),
  str("expiresAt", "Expires at", "ISO 8601 date and time the link expires."),
  str("expiredUrl", "Expired URL", "Where to redirect once the link has expired.", {
    validation: { maxLength: 32000 },
  }),
  str("password", "Password", "Password required to reach the destination.", { secret: true }),
  bool("trackConversion", "Track conversions"),
  bool("archived", "Archived"),
  bool(
    "proxy",
    "Custom link preview",
    "Use title, description and image as the link's Open Graph preview.",
  ),
  str("title", "Preview title"),
  str("description", "Preview description"),
  str("image", "Preview image URL"),
  str("video", "Preview video URL"),
  bool("rewrite", "Link cloaking", "Mask the destination URL behind the short link."),
  str("ios", "iOS URL", "Destination for iOS devices.", { validation: { maxLength: 32000 } }),
  str("android", "Android URL", "Destination for Android devices.", {
    validation: { maxLength: 32000 },
  }),
  {
    key: "geo",
    label: "Geo targeting",
    type: "json",
    hint: 'Object of country code to URL, e.g. {"US": "https://example.com/us"}.',
  },
  bool("doIndex", "Allow search engine indexing"),
  str("utm_source", "UTM source"),
  str("utm_medium", "UTM medium"),
  str("utm_campaign", "UTM campaign"),
  str("utm_term", "UTM term"),
  str("utm_content", "UTM content"),
  str(
    "ref",
    "Referral tag",
    "Populates or overrides the `ref` query parameter on the destination URL.",
  ),
];

/** Params for a link write: the destination URL (required where Dub requires it) plus the shared fields. */
export const urlParam = (required: boolean): Param => ({
  key: "url",
  label: "Destination URL",
  type: "string",
  required,
  placeholder: "https://example.com/landing",
  validation: { maxLength: 32000 },
});

/** Map form input to the request body: list fields to arrays, JSON text parsed, unset dropped. */
export function linkBody(fields: LinkFields): Record<string, unknown> {
  const input = fields as Record<string, unknown>;
  const body: Record<string, unknown> = {};
  for (const p of ["url", ...LINK_FIELD_PARAMS.map((f) => f.key)]) body[p] = input[p];
  body.tagIds = strList(input.tagIds);
  body.tagNames = strList(input.tagNames);
  body.geo = jsonValue(input.geo);
  return compact(body);
}

/** Output declared by every action that returns one link. */
export const LINK_OUTPUT = [
  { key: "id", type: "string" as const, label: "Link ID" },
  { key: "shortLink", type: "string" as const, label: "Full short link" },
  { key: "url", type: "string" as const, label: "Destination URL" },
  { key: "domain", type: "string" as const, label: "Domain" },
  { key: "key", type: "string" as const, label: "Slug" },
  { key: "qrCode", type: "string" as const, label: "QR code URL" },
  { key: "externalId", type: "string" as const, label: "External ID" },
  { key: "tags", type: "array" as const, label: "Tags" },
  { key: "clicks", type: "number" as const, label: "Clicks" },
  { key: "leads", type: "number" as const, label: "Leads" },
  { key: "sales", type: "number" as const, label: "Sales" },
  { key: "saleAmount", type: "number" as const, label: "Sale amount (cents)" },
  { key: "createdAt", type: "string" as const, label: "Created at" },
  { key: "updatedAt", type: "string" as const, label: "Updated at" },
];
