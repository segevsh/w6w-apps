import type { ActionDefinition } from "@w6w/types";
import entityRelationshipList from "../actions/entity-relationship-list.ts";
import { listPages, snapshotTrigger } from "../lib/triggers.ts";

// `GET /v2/entities/{id}/relationships` for the entity the user picks: one entity's links are a
// small bounded collection (brief 9.1c). A relationship has no id of its own; its identity is
// `type` + target id.
export default snapshotTrigger<{ entityId: string }>({
  key: "new-entity-relationship",
  title: "New Entity Relationship",
  description:
    "The run gets each relationship (parent, child, link, blocks) newly added to one entity.",
  params: [
    {
      key: "entityId",
      label: "Entity ID",
      type: "string",
      required: true,
      hint: "UUID of the feature, initiative or other entity to watch.",
    },
  ],
  load: listPages<{ entityId: string }>(
    entityRelationshipList as unknown as ActionDefinition,
    (p) => ({ entityId: p.entityId }),
  ),
  rowKey: (r) => `${r.type ?? ""}:${(r.target as { id?: unknown } | undefined)?.id ?? ""}`,
  output: [
    { key: "type", type: "string", label: "Relationship type" },
    { key: "target", type: "object", label: "Target entity (id, type)" },
  ],
  sample: {
    type: "link",
    target: { id: "7a26ba09-db99-4041-8864-bcd16e8afc5e", type: "initiative" },
  },
});
