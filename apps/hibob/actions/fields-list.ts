import type { ActionDefinition } from "@w6w/types";
import { HibobClient } from "../lib/client.ts";

/**
 * `GET /v1/company/people/fields` — metadata for every employee field, including
 * custom fields: `id` (the dot-notation id People Search takes), `categoryId`
 * (what permissions attach to), `type`, `jsonPath`, `historical`. Needs no
 * permission at all, which is why the credential probe uses it. 50/min.
 */
const fieldsList: ActionDefinition<Record<string, never>> = {
  key: "fields-list",
  type: "read",
  resource: "metadata",
  title: "List Employee Fields",
  description: "List every employee field (id, category, type) including custom fields.",
  params: [],
  output: [{ key: "fields", type: "array", label: "Field definitions" }],

  async execute(_input, ctx) {
    const fields = await new HibobClient(ctx).get<unknown[]>("/company/people/fields");
    return { fields, count: Array.isArray(fields) ? fields.length : 0 };
  },
};

export default fieldsList;
