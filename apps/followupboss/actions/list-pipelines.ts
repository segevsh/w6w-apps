import type { ActionDefinition } from "@w6w/types";
import { FubClient, type FubList, PAGE_OUTPUT } from "../lib/client.ts";

interface Input {
  name?: string;
}

/**
 * `GET /pipelines` — deal pipelines, with their stages nested.
 *
 * This is the lookup the deal actions depend on, and it is a two-for-one: each
 * pipeline carries its `stages` array inline, so one call yields both the
 * pipeline ids for Search Deals and the **stage** ids that Create Deal and
 * Update Deal actually require. There is no separate deal-stage endpoint to
 * call.
 *
 * (Not to be confused with `GET /stages`, which lists *people* stages — Lead,
 * Past Client, Trash. Two unrelated concepts sharing a word: `/stages` is where
 * a contact is in the nurture funnel, deal stages are where a transaction is in
 * a pipeline. The List Stages action covers the former.)
 *
 * The endpoint declares exactly one parameter — `name`, an **exact** match — and
 * no paging params, so none are offered. It still returns the standard
 * `_metadata` envelope, which is why the output shape matches the other lists.
 */
const listPipelines: ActionDefinition<Input> = {
  key: "list-pipelines",
  type: "search",
  resource: "pipeline",
  title: "List Pipelines",
  description:
    "List deal pipelines. Each pipeline includes its stages inline, so this one call supplies " +
    "both the pipeline ids for Search Deals and the stage ids that Create Deal requires. For " +
    "the *contact* stages (Lead, Past Client, Trash), use List Stages instead.",
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      hint: "Look up one pipeline by name. **Exact match only** — no partial matching.",
    },
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx): Promise<FubList> {
    return new FubClient(ctx).list("/pipelines", { query: { name: input.name } });
  },
};

export default listPipelines;
