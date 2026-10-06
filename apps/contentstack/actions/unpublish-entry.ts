import type { ActionDefinition } from "@w6w/types";
import { BRANCH_PARAM, call, compact, int, need, seg, str, strList } from "../lib/client.ts";

/**
 * `POST /v3/content_types/{contentTypeUid}/entries/{entryUid}/unpublish` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "unpublish-entry",
  type: "perform",
  resource: "entry",
  title: "Unpublish Entry",
  description: "Unpublish an entry from environments and locales, now or on a schedule.",
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
      key: "environments",
      label: "Environments",
      type: "string",
      required: true,
      hint: "Environment names, comma separated.",
    },
    {
      key: "locales",
      label: "Locales",
      type: "string",
      hint: "Locale codes, comma separated (e.g. en-us,fr-fr).",
    },
    {
      key: "locale",
      label: "Locale",
      type: "string",
      hint: "Source locale of the entry; the master locale when omitted.",
    },
    {
      key: "version",
      label: "Version",
      type: "number",
      hint: "Entry version; latest when omitted.",
    },
    {
      key: "scheduledAt",
      label: "Scheduled at",
      type: "string",
      hint:
        "ISO 8601 time to schedule the action, e.g. 2026-10-07T12:34:36.000Z. Immediate when omitted.",
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
    const environments = need("environments", strList(p.environments));
    const locales = strList(p.locales);
    const locale = str(p.locale);
    const version = int("version", p.version);
    const scheduledAt = str(p.scheduledAt);
    const branch = str(p.branch);
    const top = compact({ locale, version, scheduled_at: scheduledAt });
    ctx.log("info", "Contentstack Unpublish Entry", { contentTypeUid, entryUid });
    return await call(
      ctx,
      "POST",
      `/content_types/${seg(contentTypeUid)}/entries/${seg(entryUid)}/unpublish`,
      { body: { entry: compact({ environments, locales }), ...top }, branch },
    );
  },
};

export default action;
