import type { ActionDefinition } from "@w6w/types";
import { AutotaskClient, filterOf } from "../lib/client.ts";
import { canonicalEntity, ENTITIES } from "../lib/entities.ts";

/**
 * `POST /{Entity}/query/count` — how many rows match, without returning them.
 *
 * Cheaper than a query when a workflow only branches on "is there any?", and the only way to size
 * a result set that spans many 500-row pages. Same filter grammar as `entity-query`.
 */
const action: ActionDefinition = {
  key: "entity-count",
  type: "read",
  resource: "entity",
  title: "Count entities",
  description: "Count the rows of an Autotask entity that match a filter, without fetching them.",
  params: [
    {
      key: "entity",
      label: "Entity",
      type: "select",
      required: true,
      options: ENTITIES.map((e) => ({ value: e, label: e })),
    },
    {
      key: "filter",
      label: "Filter (JSON)",
      type: "json",
      hint: 'e.g. [{"op":"eq","field":"status","value":1}]. Empty counts every row.',
    },
  ],
  output: [{ key: "count", type: "number", label: "Matching rows" }],

  async execute(input, ctx) {
    const i = input as Record<string, unknown>;
    const entity = canonicalEntity(i.entity);
    if (!entity) {
      throw new Error(`\`entity\` "${String(i.entity ?? "")}" is not a queryable Autotask entity`);
    }
    const res = await new AutotaskClient(ctx).call<{ queryCount?: number }>(
      "POST",
      `/${entity}/query/count`,
      { body: { filter: filterOf(i.filter) } },
    );
    return { count: res?.queryCount ?? 0 };
  },
};

export default action;
