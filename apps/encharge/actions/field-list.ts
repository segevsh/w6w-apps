import type { ActionDefinition } from "@w6w/types";
import { EnchargeClient } from "../lib/client.ts";

/**
 * List Person Fields — `GET /v1/fields`. Verified against the OpenAPI document (`GetFields`),
 * fetched 2026-10-06.
 */
// deno-lint-ignore no-empty-interface
interface Input {}

const fieldList: ActionDefinition<Input> = {
  key: "field-list",
  type: "read",
  resource: "fields",
  title: "List Person Fields",
  description: "List every person field (built-in and custom) with its name, type and format.",
  params: [],
  output: [{
    key: "items",
    type: "array",
    label: "The fields (name, title, type, format, readOnly, array)",
  }],

  async execute(_input, ctx) {
    return await new EnchargeClient(ctx).request("GET", "/fields");
  },
};

export default fieldList;
