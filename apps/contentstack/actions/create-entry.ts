import type { ActionDefinition } from "@w6w/types";
import { BRANCH_PARAM, call, jsonObject, need, seg, str } from "../lib/client.ts";

/**
 * `POST /v3/content_types/{contentTypeUid}/entries` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "create-entry",
  type: "perform",
  resource: "entry",
  title: "Create Entry",
  description: "Create an entry in a content type. Fields follow the content type schema.",
  idempotent: false,
  params: [
    {
      key: "contentTypeUid",
      label: "Content type UID",
      type: "string",
      required: true,
      hint: "UID of the content type, e.g. blog_post.",
    },
    {
      key: "entry",
      label: "Entry fields",
      type: "json",
      required: true,
      hint: 'The entry\'s fields as a JSON object, e.g. {"title": "Home", "url": "/home"}.',
    },
    {
      key: "locale",
      label: "Locale",
      type: "string",
      hint: "Locale to create the entry in; the master locale when omitted.",
    },
    BRANCH_PARAM,
  ],
  output: [
    { key: "notice", type: "string", label: "Vendor message" },
    { key: "entry", type: "object", label: "The created entry" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const contentTypeUid = need("contentTypeUid", str(p.contentTypeUid));
    const entry = need("entry", jsonObject("entry", p.entry));
    const locale = str(p.locale);
    const branch = str(p.branch);
    ctx.log("info", "Contentstack Create Entry", { contentTypeUid });
    return await call(ctx, "POST", `/content_types/${seg(contentTypeUid)}/entries`, {
      query: { locale },
      body: { entry },
      branch,
    });
  },
};

export default action;
