import type { ActionDefinition } from "@w6w/types";
import { BRANCH_PARAM, call, jsonObject, need, seg, str } from "../lib/client.ts";

/**
 * `PUT /v3/content_types/{contentTypeUid}/entries/{entryUid}` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "update-entry",
  type: "perform",
  resource: "entry",
  title: "Update Entry",
  description:
    "Update fields of an entry. Send the whole set of fields to change; unset fields keep their value.",
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
    {
      key: "entry",
      label: "Entry fields",
      type: "json",
      required: true,
      hint: "Fields to write, as a JSON object.",
    },
    { key: "locale", label: "Locale", type: "string" },
    BRANCH_PARAM,
  ],
  output: [
    { key: "notice", type: "string", label: "Vendor message" },
    { key: "entry", type: "object", label: "The updated entry" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const contentTypeUid = need("contentTypeUid", str(p.contentTypeUid));
    const entryUid = need("entryUid", str(p.entryUid));
    const entry = need("entry", jsonObject("entry", p.entry));
    const locale = str(p.locale);
    const branch = str(p.branch);
    ctx.log("info", "Contentstack Update Entry", { contentTypeUid, entryUid });
    return await call(
      ctx,
      "PUT",
      `/content_types/${seg(contentTypeUid)}/entries/${seg(entryUid)}`,
      { query: { locale }, body: { entry }, branch },
    );
  },
};

export default action;
