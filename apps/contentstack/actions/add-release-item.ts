import type { ActionDefinition } from "@w6w/types";
import { BRANCH_PARAM, call, compact, int, need, seg, str } from "../lib/client.ts";

/**
 * `POST /v3/releases/{releaseUid}/item` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "add-release-item",
  type: "perform",
  resource: "release",
  title: "Add Item to Release",
  description: "Pin one entry or asset (at a version) to a release.",
  idempotent: false,
  params: [
    { key: "releaseUid", label: "Release UID", type: "string", required: true },
    { key: "uid", label: "Entry or asset UID", type: "string", required: true },
    {
      key: "contentTypeUid",
      label: "Content type UID",
      type: "string",
      required: true,
      hint: "Use sys_assets for an asset.",
    },
    { key: "version", label: "Version", type: "number" },
    {
      key: "action",
      label: "Action",
      type: "select",
      required: true,
      hint: "What the release does with the item.",
      options: [{ value: "publish", label: "publish" }, { value: "unpublish", label: "unpublish" }],
    },
    { key: "locale", label: "Locale", type: "string" },
    BRANCH_PARAM,
  ],
  output: [
    { key: "notice", type: "string", label: "Vendor message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const releaseUid = need("releaseUid", str(p.releaseUid));
    const uid = need("uid", str(p.uid));
    const contentTypeUid = need("contentTypeUid", str(p.contentTypeUid));
    const version = int("version", p.version);
    const action = need("action", str(p.action));
    const locale = str(p.locale);
    const branch = str(p.branch);
    ctx.log("info", "Contentstack Add Item to Release", { releaseUid });
    return await call(ctx, "POST", `/releases/${seg(releaseUid)}/item`, {
      body: { item: compact({ uid, content_type_uid: contentTypeUid, version, action, locale }) },
      branch,
    });
  },
};

export default action;
