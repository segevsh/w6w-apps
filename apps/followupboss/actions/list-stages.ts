import type { ActionDefinition } from "@w6w/types";
import {
  FubClient,
  type FubList,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

interface Input extends PageInput {
  sort?: string;
}

/**
 * `GET /stages` — the account's contact stages.
 *
 * These are the values the `stage` field on a person takes: the documented
 * example account has Contact, Buyer, Lead, Nurture, Closed, Past Client, Sphere
 * and Trash. They are per-account and renameable, which is exactly why this
 * action exists — hard-coding `"Lead"` works until a brokerage renames it.
 *
 * Two fields on each stage are worth reading:
 *
 *  - `isProtected` marks the stages Follow Up Boss will not let you delete
 *    (`Lead`, `Closed` and `Trash` in the documented example).
 *  - `peopleCount` gives the contact count per stage, which makes this a cheap
 *    funnel snapshot without touching `/people` at all.
 *
 * Not to be confused with deal *pipeline* stages, which come from List Pipelines
 * — see that action's note.
 */
const listStages: ActionDefinition<Input> = {
  key: "list-stages",
  type: "search",
  resource: "stage",
  title: "List Stages",
  description:
    "List the account's contact stages (Lead, Past Client, Trash, …) with their people counts. " +
    "Stages are per-account and renameable, so resolve them here rather than hard-coding names. " +
    "For deal pipeline stages, use List Pipelines.",
  params: [
    {
      key: "sort",
      label: "Sort",
      type: "select",
      options: [
        { value: "orderWeight", label: "Order weight (funnel order)" },
        { value: "id", label: "Id" },
        { value: "name", label: "Name" },
      ],
      hint: "Defaults to `orderWeight`, which is the order the stages appear in the funnel.",
    },
    ...PAGE_PARAMS,
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx): Promise<FubList> {
    return new FubClient(ctx).list("/stages", {
      query: { ...pageQuery(input), sort: input.sort },
    });
  },
};

export default listStages;
