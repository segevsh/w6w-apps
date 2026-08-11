import type { ActionDefinition } from "@w6w/types";
import {
  asOptionalJson,
  compact,
  type DataResult,
  encodeId,
  ProductboardClient,
} from "../lib/client.ts";
import { entityIdParam } from "../lib/params.ts";

/**
 * `PATCH /v2/entities/{id}` — update an entity, two ways.
 *
 * The body accepts `fields`, `patch`, or both, and they are not interchangeable:
 *
 *  - **`fields`** replaces whole values. `{"tags": [{"name": "api"}]}` sets the
 *    tag list to exactly that — anything already there is gone.
 *  - **`patch`** is an operation list: `[{"op": "addItems", "path": "tags",
 *    "value": [{"name": "api"}]}]`. `op` is one of `set`, `addItems`,
 *    `removeItems`, or the separate `clear` form. `path` is a field id, which
 *    for a custom field is its UUID.
 *
 * Reaching for `fields` when you meant `addItems` is how a workflow silently
 * deletes every tag but the one it was adding. When several steps may touch the
 * same multi-value field, use `patch`.
 *
 * **Idempotent.** Both forms are absolute rather than relative — `set` and
 * `addItems` of the same value converge — so a retry after a dropped connection
 * lands on the same state rather than compounding.
 */
interface Input {
  entityId: string;
  fields?: unknown;
  patch?: unknown;
  metadata?: unknown;
}

const entityUpdate: ActionDefinition<Input, DataResult> = {
  key: "entity-update",
  type: "perform",
  resource: "entity",
  title: "Update entity",
  description:
    "Update an entity by replacing whole field values, by applying set/addItems/removeItems/" +
    "clear patch operations, or both.",
  idempotent: true,
  params: [
    entityIdParam,
    {
      key: "fields",
      label: "Fields (replace)",
      type: "json",
      placeholder: '{"name": "Next awesome feature", "status": {"name": "In Progress"}}',
      hint: "Replaces each named field wholesale. For a multi-value field such as tags or teams, " +
        "this REPLACES the list — use the patch form below to add or remove members instead.",
    },
    {
      key: "patch",
      label: "Patch operations",
      type: "json",
      placeholder: '[{"op": "addItems", "path": "tags", "value": [{"name": "api"}]}]',
      hint:
        'Array of {op, path, value} where op is set, addItems or removeItems — or {op: "clear", ' +
        "path} to reset a field. `path` is a field id; for a custom field that is its UUID. " +
        "You cannot combine set/clear with addItems/removeItems on the same field.",
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      placeholder: '{"source": {"system": "Asana", "recordId": "1234567890"}}',
      hint: "Restamps the external system this update came from.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Updated entity reference" }],

  async execute(input, ctx) {
    const body = compact({
      fields: asOptionalJson<Record<string, unknown>>(input.fields, "Fields"),
      patch: asOptionalJson<unknown[]>(input.patch, "Patch operations"),
      metadata: asOptionalJson<Record<string, unknown>>(input.metadata, "Metadata"),
    });
    if (body.fields === undefined && body.patch === undefined) {
      throw new Error("Provide Fields, Patch operations, or both — an empty update does nothing");
    }
    const data = await new ProductboardClient(ctx).data(
      `/entities/${encodeId(input.entityId)}`,
      { method: "PATCH", body: { data: body } },
    );
    return { data };
  },
};

export default entityUpdate;
