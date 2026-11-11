import type { ActionDefinition } from "@w6w/types";
import entitySearch from "../actions/entity-search.ts";
import { entitiesSince, type Entity, sinceFilterTrigger, stampMs } from "../lib/triggers.ts";

// `filter.updatedAt.from` on `POST /v2/entities/search`; the id carries `updatedAt` so an edit is
// a new event (brief 9.2).
export default sinceFilterTrigger<Entity>({
  key: "new-or-updated-entity",
  title: "New or Updated Entity",
  description: "The run gets each entity that was created or updated.",
  load: entitiesSince(entitySearch as unknown as ActionDefinition, "updatedAt"),
  idOf: (entity) => `${entity.id ?? ""}:${entity.updatedAt ?? ""}`,
  tsOf: (entity) => stampMs(entity.updatedAt),
  output: [
    { key: "id", type: "string", label: "Entity ID" },
    { key: "type", type: "string", label: "Entity type" },
    { key: "fields", type: "object", label: "Fields" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "195a1cb2-728f-4be8-900f-aebbd84d7944",
    type: "feature",
    fields: { name: "Awesome Public API" },
    updatedAt: "2026-11-10T09:30:00Z",
  },
});
