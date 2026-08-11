import type { ActionDefinition } from "@w6w/types";
import { compact, type DataResult, encodeId, ProductboardClient } from "../lib/client.ts";
import { entityIdParam, entityTypeOptions } from "../lib/params.ts";

/**
 * `PUT /v2/entities/{id}/relationships/parent` — move an entity in the
 * hierarchy.
 *
 * The only `PUT` in the Entities surface, and the verb is the point: an entity
 * has at most one parent, so this **replaces** whatever it had. `POST
 * .../relationships` with `type: "parent"` is refused with a `409` once a parent
 * exists, which is the trap this action exists to avoid.
 *
 * **Idempotent.** Setting the parent to the value it already has is a no-op.
 */
interface Input {
  entityId: string;
  targetId: string;
  targetType?: string;
}

const entityParentSet: ActionDefinition<Input, DataResult> = {
  key: "entity-parent-set",
  type: "perform",
  resource: "entity",
  title: "Set entity parent",
  description:
    "Move an entity under a new parent, replacing its current one. This is the only way to " +
    "re-parent — creating a parent relationship on an entity that already has one is a 409.",
  idempotent: true,
  params: [
    entityIdParam,
    {
      key: "targetId",
      label: "New parent ID",
      type: "string",
      required: true,
      hint:
        "UUID of the entity that becomes the parent — a product for a component, a component for " +
        "a feature, a feature for a subfeature. Addressed by id only: the target schema " +
        "(`ResourceReferenceAssign`) carries nothing but `id`.",
    },
    {
      key: "targetType",
      label: "New parent type",
      type: "select",
      options: entityTypeOptions,
      hint:
        "Optional, and it goes at the top level of the body rather than inside the target — the " +
        "schema puts an `EntityType` beside `target`, not in it. Supply it only when you want " +
        "the request to fail if the target turns out to be something else.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Replaced relationship" }],

  async execute(input, ctx) {
    const data = await new ProductboardClient(ctx).data(
      `/entities/${encodeId(input.entityId)}/relationships/parent`,
      {
        method: "PUT",
        body: {
          data: compact({ type: input.targetType, target: { id: input.targetId } }),
        },
      },
    );
    return { data };
  },
};

export default entityParentSet;
