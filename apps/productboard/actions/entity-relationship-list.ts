import type { ActionDefinition } from "@w6w/types";
import { encodeId, type ListResult, ProductboardClient } from "../lib/client.ts";
import {
  entityIdParam,
  entityRelationshipTypeOptions,
  entityTypeOptions,
  listOutput,
  pageCursorParam,
} from "../lib/params.ts";

/**
 * `GET /v2/entities/{id}/relationships` — how this entity connects to the rest.
 *
 * One of v2's genuinely new capabilities: in v1 the graph had to be reassembled
 * from `/features/{id}/links/initiatives`, `/objectives/{id}/links/features`
 * and their siblings, one endpoint per pairing. Here it is one call, filterable
 * by relationship type and by target.
 *
 * The relationship envelope paginates independently of the entity — an entity
 * response embeds `relationships.data` with its own `links.next`, which is why
 * this endpoint exists at all rather than being folded into `entity-get`.
 */
interface Input {
  entityId: string;
  type?: string;
  targetType?: string;
  targetId?: string;
  pageCursor?: string;
}

const entityRelationshipList: ActionDefinition<Input, ListResult> = {
  key: "entity-relationship-list",
  type: "search",
  resource: "entity",
  title: "List entity relationships",
  description:
    "List an entity's parent, child, link, isBlockedBy and isBlocking relationships, optionally " +
    "narrowed to one type or one target.",
  params: [
    entityIdParam,
    {
      key: "type",
      label: "Relationship type",
      type: "select",
      options: entityRelationshipTypeOptions,
      hint: "Leave empty for every type.",
    },
    {
      key: "targetType",
      label: "Target entity type",
      type: "select",
      options: entityTypeOptions,
      hint: "Sent as `target[type]`.",
    },
    {
      key: "targetId",
      label: "Target entity ID",
      type: "string",
      hint: "Sent as `target[id]`. Use it to ask whether one specific link exists.",
    },
    pageCursorParam,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new ProductboardClient(ctx).list(
      `/entities/${encodeId(input.entityId)}/relationships`,
      {
        query: {
          type: input.type,
          "target[type]": input.targetType,
          "target[id]": input.targetId,
          pageCursor: input.pageCursor,
        },
      },
    );
  },
};

export default entityRelationshipList;
