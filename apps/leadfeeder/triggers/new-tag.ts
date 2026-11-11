import type { TriggerDefinition } from "@w6w/types";
import tagList from "../actions/tag-list.ts";
import { accountIdParam } from "../lib/params.ts";
import { newRecords, readAllPages } from "../lib/triggers.ts";

/**
 * An account has a small bounded set of tags and GET /v1/tags has no sort or since filter.
 * Every check reads all pages through `tag-list` and diffs the ids (`pollSnapshot`, added only).
 * https://api.leadfeeder.com/openapi.yaml, `getTags` (2026-11-10)
 */
const trigger: TriggerDefinition = {
  key: "new-tag",
  title: "New Tag",
  description: "The run gets each company tag newly created in the chosen Leadfeeder account.",
  params: [
    accountIdParam,
  ],
  output: [
    { key: "id", type: "string", label: "Tag ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "attributes", type: "object", label: "Tag attributes" },
  ],
  sample: { id: "77", type: "tag", attributes: { name: "Priority" } },
  minIntervalMs: 300_000,
  async poll({ state, params }, ctx) {
    const p = params as { accountId: string };
    return newRecords({
      state,
      items: await readAllPages(tagList, { accountId: p.accountId }, ctx),
    });
  },
};

export default trigger;
