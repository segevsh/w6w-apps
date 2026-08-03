import type { ActionDefinition } from "@w6w/types";
import { CopperClient, RELATED_ENTITIES } from "../lib/client.ts";

interface Input {
  entity: string;
  entityId: number | string;
  relatedEntity?: string;
}

/**
 * `GET /{entity}/{id}/related` — everything related to a record, or
 * `GET /{entity}/{id}/related/{related_entity}` for one type of relation.
 *
 * Copper documents these as two endpoints; they differ only by a trailing path
 * segment, so one action covers both.
 *
 * Worth knowing before using it:
 *
 *   - **The response is identifiers, not records.** Copper returns an array of
 *     `{id, type}` stubs — "The Related Items API uses Identifiers (as opposed
 *     to full objects)". Fetching the actual records is a second call per stub.
 *   - **Relationships are bidirectional and constrained.** Relating A to B is
 *     the same as relating B to A, and only certain pairs are legal: Leads relate
 *     only to Tasks; People to Companies (max 1), Opportunities, Tasks and
 *     Projects; Companies, Opportunities and Projects to each other's obvious
 *     counterparts; Tasks to Companies, People, Opportunities, Leads and Projects
 *     (one total). An illegal `relatedEntity` is a 4xx from Copper.
 *   - **This is how you re-point a Person at a different Company.** Copper's
 *     update endpoint returns `company_id` but will not change it — the
 *     documented route is to remove and re-add the relation here.
 */
const listRelatedItems: ActionDefinition<Input> = {
  key: "list-related-items",
  type: "search",
  resource: "related-item",
  title: "List Related Items",
  description:
    "List the records related to a Lead, Person, Company, Opportunity, Project or Task — " +
    "optionally narrowed to one related type. Returns `{id, type}` identifiers, not full records.",
  params: [
    {
      key: "entity",
      label: "Entity type",
      type: "select",
      required: true,
      options: RELATED_ENTITIES.map((e) => ({ value: e, label: e })),
      hint: "The record whose relations you want. Plural, as it appears in the URL.",
    },
    { key: "entityId", label: "Entity ID", type: "string", required: true },
    {
      key: "relatedEntity",
      label: "Related entity type",
      type: "select",
      options: RELATED_ENTITIES.map((e) => ({ value: e, label: e })),
      hint:
        "Optional. Omitted, every relation is returned. Only certain pairs are legal — a Lead, " +
        "for instance, relates only to Tasks.",
    },
  ],
  output: [{ key: "items", type: "array", label: "Related record identifiers" }],

  async execute(input, ctx) {
    const base = `/${encodeURIComponent(input.entity)}/${
      encodeURIComponent(String(input.entityId))
    }/related`;
    const path = input.relatedEntity
      ? `${base}/${encodeURIComponent(input.relatedEntity)}`
      : `${base}/`;
    const items = await new CopperClient(ctx).request<unknown[]>(path);
    return { items: items ?? [] };
  },
};

export default listRelatedItems;
