import type { ActionDefinition } from "@w6w/types";
import { bool, BRANCH_PARAM, call, need, seg, str } from "../lib/client.ts";

/**
 * `DELETE /v3/content_types/{contentTypeUid}/entries/{entryUid}` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "delete-entry",
  type: "perform",
  resource: "entry",
  title: "Delete Entry",
  description: "Delete an entry in one locale, or in all locales.",
  idempotent: true,
  params: [
    {
      key: "contentTypeUid",
      label: "Content type UID",
      type: "string",
      required: true,
      hint: "UID of the content type, e.g. blog_post.",
    },
    { key: "entryUid", label: "Entry UID", type: "string", required: true },
    { key: "locale", label: "Locale", type: "string" },
    {
      key: "deleteAllLocalized",
      label: "Delete all localized",
      type: "boolean",
      hint: "Delete every localized version of the entry.",
    },
    BRANCH_PARAM,
  ],
  output: [
    { key: "notice", type: "string", label: "Vendor message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const contentTypeUid = need("contentTypeUid", str(p.contentTypeUid));
    const entryUid = need("entryUid", str(p.entryUid));
    const locale = str(p.locale);
    const deleteAllLocalized = bool(p.deleteAllLocalized);
    const branch = str(p.branch);
    ctx.log("info", "Contentstack Delete Entry", { contentTypeUid, entryUid });
    return await call(
      ctx,
      "DELETE",
      `/content_types/${seg(contentTypeUid)}/entries/${seg(entryUid)}`,
      { query: { locale, delete_all_localized: deleteAllLocalized }, branch },
    );
  },
};

export default action;
