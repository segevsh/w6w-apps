import type { ActionDefinition } from "@w6w/types";
import { bool, BRANCH_PARAM, call, compact, need, str } from "../lib/client.ts";

/**
 * `POST /v3/releases` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "create-release",
  type: "perform",
  resource: "release",
  title: "Create Release",
  description: "Create an empty release to pin entries and assets to.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, hint: "Release name." },
    { key: "description", label: "Description", type: "string" },
    { key: "locked", label: "Locked", type: "boolean", hint: "Lock the release against changes." },
    { key: "archived", label: "Archived", type: "boolean" },
    BRANCH_PARAM,
  ],
  output: [
    { key: "notice", type: "string", label: "Vendor message" },
    { key: "release", type: "object", label: "The created release" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = need("name", str(p.name));
    const description = str(p.description);
    const locked = bool(p.locked);
    const archived = bool(p.archived);
    const branch = str(p.branch);
    ctx.log("info", "Contentstack Create Release");
    return await call(ctx, "POST", "/releases", {
      body: { release: compact({ name, description, locked, archived }) },
      branch,
    });
  },
};

export default action;
