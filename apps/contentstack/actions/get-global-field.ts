import type { ActionDefinition } from "@w6w/types";
import { bool, BRANCH_PARAM, call, int, need, seg, str } from "../lib/client.ts";

/**
 * `GET /v3/global_fields/{globalFieldUid}` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "get-global-field",
  type: "read",
  resource: "global_field",
  title: "Get Global Field",
  description: "One global field and its schema.",
  params: [
    { key: "globalFieldUid", label: "Global field UID", type: "string", required: true },
    { key: "version", label: "Version", type: "number" },
    { key: "includeGlobalFieldSchema", label: "Include global field schema", type: "boolean" },
    BRANCH_PARAM,
  ],
  output: [
    { key: "global_field", type: "object", label: "The global field" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const globalFieldUid = need("globalFieldUid", str(p.globalFieldUid));
    const version = int("version", p.version);
    const includeGlobalFieldSchema = bool(p.includeGlobalFieldSchema);
    const branch = str(p.branch);
    ctx.log("info", "Contentstack Get Global Field", { globalFieldUid });
    return await call(ctx, "GET", `/global_fields/${seg(globalFieldUid)}`, {
      query: { version, include_global_field_schema: includeGlobalFieldSchema },
      branch,
    });
  },
};

export default action;
