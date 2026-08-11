import type { ActionDefinition } from "@w6w/types";
import { compact, type DataResult, encodeId, ProductboardClient } from "../lib/client.ts";
import { entityIdParam, entityRelationshipTypeOptions } from "../lib/params.ts";

/**
 * `POST /v2/entities/{id}/relationships` — connect two entities.
 *
 * The vendor's default for `type` is `link` — a generic, bidirectional
 * connection with no semantics. The other four carry meaning and are the reason
 * this endpoint is worth automating: `isBlockedBy` / `isBlocking` express a
 * dependency, and `parent` / `child` move an entity in the hierarchy.
 *
 * **`parent` is a special case with its own endpoint.** An entity has at most
 * one parent, so re-parenting is a *replace*, not a create — this endpoint
 * answers `409` when a parent already exists. Use `entity-parent-set`
 * (`PUT .../relationships/parent`) for that; it is the only operation in this
 * group that is a `PUT`.
 *
 * **Idempotent.** Creating a relationship that already exists converges on the
 * same graph, and the endpoint's own `409` distinguishes "already there" from
 * "refused".
 */
interface Input {
  entityId: string;
  type?: string;
  targetId: string;
}

const entityRelationshipCreate: ActionDefinition<Input, DataResult> = {
  key: "entity-relationship-create",
  type: "perform",
  resource: "entity",
  title: "Create entity relationship",
  description:
    "Link one entity to another as link, child, isBlockedBy or isBlocking. Use Set entity parent " +
    "to re-parent, which is a replace rather than a create.",
  idempotent: true,
  params: [
    entityIdParam,
    {
      key: "type",
      label: "Relationship type",
      type: "select",
      options: entityRelationshipTypeOptions,
      default: "link",
      hint:
        "`link` is the vendor default and carries no semantics. `parent` will be refused with a " +
        "409 when the entity already has one — use Set entity parent instead.",
    },
    {
      key: "targetId",
      label: "Target entity ID",
      type: "string",
      required: true,
      hint:
        "UUID of the entity on the other end. The target is addressed by id ONLY — the schema " +
        "(`ResourceReferenceAssign`) has no name or email form here, unlike the owner and status " +
        "fields on an entity.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Created relationship" }],

  async execute(input, ctx) {
    const data = await new ProductboardClient(ctx).data(
      `/entities/${encodeId(input.entityId)}/relationships`,
      {
        method: "POST",
        body: {
          data: compact({ type: input.type, target: { id: input.targetId } }),
        },
      },
    );
    return { data };
  },
};

export default entityRelationshipCreate;
