import type { ActionDefinition } from "@w6w/types";
import entitySearch from "../actions/entity-search.ts";
import { entitiesSince, type Entity, sinceFilterTrigger, stampMs } from "../lib/triggers.ts";

// `POST /v2/entities/search` takes `filter.createdAt.from` (EntitySearchFilter, DateRangeFilter in
// https://developer.productboard.com/openapi/entities.yaml), so this is a since-filter poll
// (brief 9.1b). `entity-list` returns the same records but has no date filter.
export default sinceFilterTrigger<Entity>({
  key: "new-entity",
  title: "New Entity",
  description:
    "The run gets each newly created feature, initiative, objective, release or other entity.",
  load: entitiesSince(entitySearch as unknown as ActionDefinition, "createdAt"),
  idOf: (entity) => String(entity.id ?? ""),
  tsOf: (entity) => stampMs(entity.createdAt),
  output: [
    { key: "id", type: "string", label: "Entity ID" },
    { key: "type", type: "string", label: "Entity type" },
    { key: "fields", type: "object", label: "Fields" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: "195a1cb2-728f-4be8-900f-aebbd84d7944",
    type: "feature",
    fields: { name: "Awesome Public API" },
    createdAt: "2026-11-10T09:00:00Z",
  },
});
