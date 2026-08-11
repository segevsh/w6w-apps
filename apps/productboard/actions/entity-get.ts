import type { ActionDefinition } from "@w6w/types";
import { type DataResult, encodeId, ProductboardClient, toList } from "../lib/client.ts";
import { entityIdParam, fieldsParam } from "../lib/params.ts";

/**
 * `GET /v2/entities/{id}` — one entity of any type, by id.
 *
 * The response is `{data: {id, type, fields, relationships?, metadata?,
 * createdAt, updatedAt}}`. `fields` mixes named fields (`name`, `status`,
 * `owner`, `timeframe`, `teams`, `archived`, `health`, `workProgress`, `tags`)
 * with the workspace's custom fields keyed by bare UUID — run
 * `entity-configuration-get` to learn what those UUIDs are.
 *
 * `links.html` is `null` rather than absent when the workspace has no domain
 * configured, which the vendor documents on newly-onboarded spaces.
 */
interface Input {
  entityId: string;
  fields?: string;
}

const entityGet: ActionDefinition<Input, DataResult> = {
  key: "entity-get",
  type: "read",
  resource: "entity",
  title: "Get entity",
  description: "Retrieve one product, component, feature, initiative, objective, release, " +
    "company or user by ID.",
  params: [entityIdParam, fieldsParam],
  output: [{ key: "data", type: "object", label: "Entity" }],

  async execute(input, ctx) {
    const data = await new ProductboardClient(ctx).data(
      `/entities/${encodeId(input.entityId)}`,
      { query: { "fields[]": toList(input.fields) } },
    );
    return { data };
  },
};

export default entityGet;
