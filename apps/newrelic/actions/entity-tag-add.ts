import type { ActionDefinition } from "@w6w/types";
import { csv, mutationErrors, NewRelicClient } from "../lib/client.ts";
import { guidParam } from "../lib/params.ts";

/**
 * `taggingAddTagsToEntity` — attach tags to an entity.
 *
 * Tags are how New Relic is organised: alert conditions, dashboards, workloads
 * and entity searches all select on them, so tagging an entity at deploy time
 * is what makes it appear in everything it should.
 *
 * ## A tag key holds several values
 *
 * `team: ["platform"]`, not `team: "platform"`. Adding a second value to an
 * existing key **appends** rather than replaces — `taggingReplaceTagsOnEntity`
 * is the one that replaces, and is not wrapped here because a replace that
 * silently drops the tags somebody else set is a worse default than an append.
 *
 * ## The failure is inside a 200
 *
 * This mutation reports its own errors in `data.taggingAddTagsToEntity.errors`,
 * with no GraphQL-level error and no HTTP status to notice. `mutationErrors()`
 * is what turns that into a thrown error, and it is the reason this action is
 * not simply a `graphql-query` call.
 */
const action: ActionDefinition = {
  key: "entity-tag-add",
  type: "perform",
  resource: "tag",
  title: "Add tags to an entity",
  description:
    "Attach tags, which is how alerts, dashboards and workloads select things. Adding to an " +
    "existing key APPENDS rather than replacing.",
  idempotent: true,
  params: [
    guidParam("Entity GUID", "From `entity-search`."),
    {
      key: "key",
      label: "Tag Key",
      type: "string",
      required: true,
      default: "",
      placeholder: "team",
    },
    {
      key: "values",
      label: "Values",
      type: "string",
      required: true,
      default: "",
      hint: "Comma-separated. A tag key holds a list, and adding appends to whatever is there.",
    },
  ],
  output: [
    { key: "tagged", type: "boolean", label: "Applied" },
    { key: "guid", type: "string", label: "The entity" },
    { key: "key", type: "string", label: "The tag key" },
    { key: "values", type: "array", label: "The values added" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const guid = String(p.guid ?? "").trim();
    const key = String(p.key ?? "").trim();
    const values = csv(p.values);
    if (!guid) throw new Error("`guid` is required");
    if (!key) throw new Error("`key` is required");
    if (!values || values.length === 0) throw new Error("`values` is required");

    const data = await new NewRelicClient(ctx).gql<{
      taggingAddTagsToEntity?: { errors?: Array<{ message?: string; type?: string }> };
    }>(
      `mutation($guid: EntityGuid!, $tags: [TaggingTagInput!]!) {
        taggingAddTagsToEntity(guid: $guid, tags: $tags) {
          errors { message type }
        }
      }`,
      { guid, tags: [{ key, values }] },
    );

    // HTTP 200, no GraphQL errors, and it may still have failed.
    mutationErrors(data?.taggingAddTagsToEntity, "taggingAddTagsToEntity");

    ctx.log("info", "tagged a New Relic entity", { key, valueCount: values.length });
    return { tagged: true, guid, key, values };
  },
};

export default action;
