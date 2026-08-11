import type { ActionDefinition } from "@w6w/types";
import { type DeleteResult, encodeId, ProductboardClient } from "../lib/client.ts";
import { entityIdParam, entityRelationshipTypeOptions } from "../lib/params.ts";

/**
 * `DELETE /v2/entities/{id}/relationships/{type}/{targetId}` — cut one link.
 *
 * Both the relationship type and the target id are path segments, so unlike the
 * list endpoint there is no "delete every link to this target" form: the type
 * has to be named. Getting it wrong is a `404`, not a silent no-op.
 *
 * This removes the *relationship*, never either entity. It is the safe
 * counterpart to `entity-delete`, which is not.
 *
 * **Idempotent.** Removing an absent link is the same end state.
 */
interface Input {
  entityId: string;
  type: string;
  targetId: string;
}

const entityRelationshipDelete: ActionDefinition<Input, DeleteResult> = {
  key: "entity-relationship-delete",
  type: "perform",
  resource: "entity",
  title: "Delete entity relationship",
  description:
    "Remove one relationship between two entities. Deletes the link only — both entities survive.",
  idempotent: true,
  params: [
    entityIdParam,
    {
      key: "type",
      label: "Relationship type",
      type: "select",
      required: true,
      options: entityRelationshipTypeOptions,
      hint: "Must match the existing relationship's type exactly — it is a path segment, and a " +
        "mismatch answers 404 rather than doing nothing quietly.",
    },
    {
      key: "targetId",
      label: "Target entity ID",
      type: "string",
      required: true,
      hint: "UUID of the entity at the other end.",
    },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
    { key: "deleted", type: "boolean", label: "The relationship was removed" },
  ],

  async execute(input, ctx) {
    const status = await new ProductboardClient(ctx).status(
      `/entities/${encodeId(input.entityId)}/relationships/${encodeId(input.type)}/${
        encodeId(input.targetId)
      }`,
      { method: "DELETE" },
    );
    return { status, deleted: status === 204 };
  },
};

export default entityRelationshipDelete;
