import type { ActionDefinition } from "@w6w/types";
import { compact, SentryClient } from "../lib/client.ts";
import { ORG_PARAM } from "../lib/params.ts";

/**
 * `PUT /api/0/organizations/{org}/releases/{version}/` — verified against
 * Sentry's OpenAPI schema (`updateOrganizationRelease`). Every body property
 * is optional; only what the caller set is sent.
 */
const action: ActionDefinition = {
  key: "release-update",
  type: "perform",
  resource: "release",
  title: "Update a release",
  description: "Set a release's ref, URL, release date, or commit refs.",
  idempotent: true,
  params: [
    ORG_PARAM,
    { key: "version", label: "Version", type: "string", required: true, default: "" },
    { key: "ref", label: "Ref", type: "string", default: "" },
    { key: "url", label: "URL", type: "string", default: "" },
    { key: "dateReleased", label: "Date Released", type: "datetime", default: "" },
    {
      key: "refs",
      label: "Commit Refs",
      type: "json",
      default: "",
      hint: "JSON array of {repository, commit, previousCommit?}.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Release ID" },
    { key: "version", type: "string", label: "Version" },
    { key: "ref", type: "string", label: "Ref" },
    { key: "url", type: "string", label: "URL" },
    { key: "dateReleased", type: "string", label: "Released at" },
    { key: "projects", type: "array", label: "Projects" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const version = String(p.version ?? "").trim();
    if (!version) throw new Error("`version` is required");

    let refs: unknown = undefined;
    if (typeof p.refs === "string" && p.refs.trim()) {
      try {
        refs = JSON.parse(p.refs);
      } catch {
        throw new Error("`refs` is not valid JSON");
      }
    } else if (Array.isArray(p.refs)) {
      refs = p.refs;
    }

    const body = compact({ ref: p.ref, url: p.url, dateReleased: p.dateReleased, refs });
    if (Object.keys(body).length === 0) {
      throw new Error("nothing to update — set at least one field");
    }

    const client = SentryClient.fromConnection(ctx);
    const org = SentryClient.orgFrom(ctx, p.organizationSlug);
    ctx.log("info", "updating Sentry release", { org, version, fields: Object.keys(body) });

    return await client.request(
      `/organizations/${encodeURIComponent(org)}/releases/${encodeURIComponent(version)}/`,
      { method: "PUT", body },
    );
  },
};

export default action;
