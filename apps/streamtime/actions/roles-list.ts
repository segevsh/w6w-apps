import type { ActionDefinition } from "@w6w/types";
import { compact, StreamtimeClient } from "../lib/client.ts";

/**
 * `GET /roles` — the organisation's roles.
 *
 * The only query parameter on the whole reference surface is
 * `include_archived`, documented with an explicit default of `false`, so it is
 * sent only when the caller asks for it: `?include_archived=false` would be
 * relying on how the vendor parses a false boolean, which the document does not
 * state.
 */
interface Input {
  includeArchived?: boolean;
}

const rolesList: ActionDefinition<Input> = {
  key: "roles-list",
  type: "search",
  resource: "role",
  title: "List Roles",
  description: "List the organisation's roles. Archived roles are excluded unless asked for.",
  params: [
    {
      key: "includeArchived",
      label: "Include Archived",
      type: "boolean",
      default: false,
      hint: "Streamtime's own default is false.",
    },
  ],
  output: [
    { key: "roles", type: "array", label: "Roles — `{ id, name, active }`" },
  ],

  async execute(input, ctx) {
    const roles = await new StreamtimeClient(ctx).request<unknown[]>("/roles", {
      query: compact({ include_archived: input.includeArchived === true ? "true" : undefined }),
    });
    return { roles: roles ?? [] };
  },
};

export default rolesList;
