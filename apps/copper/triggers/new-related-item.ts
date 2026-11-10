import type { TriggerDefinition } from "@w6w/types";
import { RELATED_ENTITIES } from "../lib/client.ts";
import { pollNewRelatedItems, type RelatedParams } from "../lib/polls.ts";

/**
 * The records related to one record are a small bounded list of `{id, type}` identifiers
 * (https://developer.copper.com/related-items/view-all-records-related-to-an-entity.html,
 * 2026-11-10). Copper's webhooks exclude new entity relationships, so each check reads the list
 * through `list-related-items` and diffs `type:id` (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition<RelatedParams> = {
  key: "new-related-item",
  title: "New Related Item",
  description: "The run gets each record newly related to the Copper record you name.",
  params: [
    {
      key: "entity",
      label: "Entity type",
      type: "select",
      required: true,
      options: RELATED_ENTITIES.map((e) => ({ value: e, label: e })),
      hint: "The record whose relations to watch. Plural, as it appears in the URL.",
    },
    { key: "entityId", label: "Entity ID", type: "string", required: true },
    {
      key: "relatedEntity",
      label: "Related entity type",
      type: "select",
      options: RELATED_ENTITIES.map((e) => ({ value: e, label: e })),
      hint: "Optional. Omitted, every relation is watched.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Related record ID" },
    { key: "type", type: "string", label: "Related record type" },
  ],
  sample: { id: 4417020, type: "opportunity" },
  minIntervalMs: 300_000,
  poll({ state, params }, ctx) {
    return pollNewRelatedItems(state, params, ctx);
  },
};

export default trigger;
