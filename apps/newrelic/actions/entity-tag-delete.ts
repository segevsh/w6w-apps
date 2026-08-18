import type { ActionDefinition } from "@w6w/types";
import { csv, mutationErrors, NewRelicClient } from "../lib/client.ts";
import { guidParam } from "../lib/params.ts";

/**
 * `taggingDeleteTagFromEntity` — remove whole tag keys from an entity.
 *
 * ## It removes the key and everything under it
 *
 * Deleting `team` removes every value that key held, not one of them.
 * Removing a single value is `taggingDeleteTagValuesFromEntity`, a different
 * mutation with a different argument shape — this action offers both, because
 * the distinction is invisible until the wrong one has run.
 *
 * ## What breaks when a tag goes
 *
 * Tags are selectors. An entity that loses the tag an alert condition or a
 * workload selects on stops being covered by it — silently, immediately, and
 * with nothing to notice until something goes wrong unwatched. That is worth
 * knowing before automating tag removal.
 *
 * Like every mutation here, the failure arrives inside a 200.
 */
const action: ActionDefinition = {
  key: "entity-tag-delete",
  type: "perform",
  resource: "tag",
  title: "Remove tags from an entity",
  description:
    "Remove a whole tag key, or specific values. Alerts and workloads SELECT on tags, so " +
    "removing one can quietly drop an entity out of what was watching it.",
  idempotent: true,
  params: [
    guidParam("Entity GUID", "From `entity-search`."),
    {
      key: "key",
      label: "Tag Key",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "values",
      label: "Values",
      type: "string",
      default: "",
      hint: "Leave blank to remove the whole key and everything under it. Give values to remove " +
        "only those — a different mutation, and the distinction is invisible afterwards.",
    },
  ],
  output: [
    { key: "removed", type: "boolean", label: "Applied" },
    { key: "guid", type: "string", label: "The entity" },
    { key: "key", type: "string", label: "The tag key" },
    { key: "wholeKey", type: "boolean", label: "Whether the key itself was removed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const guid = String(p.guid ?? "").trim();
    const key = String(p.key ?? "").trim();
    if (!guid) throw new Error("`guid` is required");
    if (!key) throw new Error("`key` is required");
    const values = csv(p.values);

    const client = new NewRelicClient(ctx);

    if (values && values.length > 0) {
      const data = await client.gql<{
        taggingDeleteTagValuesFromEntity?: {
          errors?: Array<{ message?: string; type?: string }>;
        };
      }>(
        `mutation($guid: EntityGuid!, $tagValues: [TaggingTagValueInput!]!) {
          taggingDeleteTagValuesFromEntity(guid: $guid, tagValues: $tagValues) {
            errors { message type }
          }
        }`,
        { guid, tagValues: values.map((value) => ({ key, value })) },
      );
      mutationErrors(data?.taggingDeleteTagValuesFromEntity, "taggingDeleteTagValuesFromEntity");
      ctx.log("info", "removed New Relic tag values", { key, valueCount: values.length });
      return { removed: true, guid, key, wholeKey: false };
    }

    const data = await client.gql<{
      taggingDeleteTagFromEntity?: { errors?: Array<{ message?: string; type?: string }> };
    }>(
      `mutation($guid: EntityGuid!, $tagKeys: [String!]!) {
        taggingDeleteTagFromEntity(guid: $guid, tagKeys: $tagKeys) {
          errors { message type }
        }
      }`,
      { guid, tagKeys: [key] },
    );
    mutationErrors(data?.taggingDeleteTagFromEntity, "taggingDeleteTagFromEntity");

    ctx.log(
      "warn",
      "removed a whole New Relic tag key — anything selecting on it drops this " +
        "entity",
      { key },
    );
    return { removed: true, guid, key, wholeKey: true };
  },
};

export default action;
