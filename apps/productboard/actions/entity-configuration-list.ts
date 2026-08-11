import type { ActionDefinition } from "@w6w/types";
import { type ListResult, ProductboardClient, toList } from "../lib/client.ts";
import { entityTypeOptions } from "../lib/params.ts";

/**
 * `GET /v2/entities/configurations` — what fields does THIS workspace have?
 *
 * This is the endpoint that makes the rest of the Entities surface usable, and
 * it is the one most integrations skip. Productboard's v2 model is
 * configuration-driven: the fields an entity has, their types, their validation
 * rules and which patch operations each accepts are all properties of the
 * *workspace*, not of the API. Custom fields appear as bare UUID keys in
 * `fields` — so a response containing
 * `"faa1d59a-d55f-4ad2-b1d3-5b888123873b": 120` is meaningless until this
 * endpoint tells you that UUID is "Estimated effort".
 *
 * It is also this app's health probe: no id, no customer data, no personal
 * data. See `auth/api-token.ts`.
 *
 * `nextPageCursor` is surfaced because the response envelope carries
 * `links.next`, but **the endpoint documents no `pageCursor` parameter**, so
 * there is no honest way to offer paging here and none is offered. In practice
 * a workspace has at most eleven configurations.
 */
interface Input {
  types?: string[] | string;
}

const entityConfigurationList: ActionDefinition<Input, ListResult> = {
  key: "entity-configuration-list",
  type: "read",
  resource: "entity",
  title: "List entity configurations",
  description:
    "Discover which fields each entity type has in this workspace, their types, and the patch " +
    "operations they support. Custom fields are addressed by UUID; this is where those UUIDs get " +
    "their names.",
  params: [
    {
      key: "types",
      label: "Entity types",
      type: "multiselect",
      options: entityTypeOptions,
      hint: "Sent as repeated `type[]` values. Leave empty for every configured type. The exact " +
        "set available varies by workspace configuration.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Configurations" },
    { key: "nextPageCursor", type: "string", label: "Cursor for the next page" },
    { key: "hasMore", type: "boolean", label: "Another page is available" },
  ],

  execute(input, ctx) {
    return new ProductboardClient(ctx).list("/entities/configurations", {
      query: { "type[]": toList(input.types) },
    });
  },
};

export default entityConfigurationList;
