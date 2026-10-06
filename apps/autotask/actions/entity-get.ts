import type { ActionDefinition } from "@w6w/types";
import { AutotaskClient } from "../lib/client.ts";
import { canonicalEntity, ENTITIES } from "../lib/entities.ts";

/**
 * `GET /{Entity}/{id}` — one record by id.
 *
 * Autotask answers an id that does not exist with `{"item": null}` and a 200, not a 404, so a
 * missing record is reported as `found: false` rather than thrown.
 */
const action: ActionDefinition = {
  key: "entity-get",
  type: "read",
  resource: "entity",
  title: "Get entity by id",
  description:
    "Read one Autotask record by id. A missing id returns `found: false` (the API answers 200 " +
    "with a null item).",
  params: [
    {
      key: "entity",
      label: "Entity",
      type: "select",
      required: true,
      options: ENTITIES.map((e) => ({ value: e, label: e })),
    },
    { key: "id", label: "ID", type: "number", required: true },
  ],
  output: [
    { key: "found", type: "boolean", label: "Whether the record exists" },
    { key: "item", type: "object", label: "The record" },
  ],

  async execute(input, ctx) {
    const i = input as Record<string, unknown>;
    const entity = canonicalEntity(i.entity);
    if (!entity) {
      throw new Error(`\`entity\` "${String(i.entity ?? "")}" is not a queryable Autotask entity`);
    }
    const id = Number(i.id);
    if (!Number.isInteger(id) || id < 0) throw new Error("`id` must be a non-negative integer");
    const res = await new AutotaskClient(ctx).call<{ item?: unknown }>("GET", `/${entity}/${id}`);
    const item = res?.item ?? null;
    return { found: item !== null, item };
  },
};

export default action;
