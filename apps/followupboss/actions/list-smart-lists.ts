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
  all?: boolean;
  fub2?: boolean;
}

/**
 * `GET /smartLists` — the account's saved Smart Lists.
 *
 * A Smart List is a saved contact filter, and its id feeds the `smartListId`
 * parameter on Search People. That pairing is the reason to ship this action: it
 * lets a workflow drive off a segment the brokerage already maintains in the UI
 * ("Hot Buyers", "No contact in 30 days") instead of re-encoding those rules as
 * query parameters that will drift out of sync.
 *
 * ## The default hides most of them
 *
 * The one thing to know, from the endpoint's own parameter docs: "By default
 * this endpoint only returns Smart Lists created in the **classic** version of
 * our UI. To return Smart Lists created in our current version, use this
 * parameter" — `fub2` — and `all` returns "all smart lists, whether from FUB
 * Classic or FUB".
 *
 * So the *default* response is the legacy subset, and on a modern account it can
 * easily be empty while the UI shows a dozen lists. `all` is almost always what
 * someone actually wants, and the hint says so rather than leaving them to
 * conclude the endpoint is broken.
 */
const listSmartLists: ActionDefinition<Input> = {
  key: "list-smart-lists",
  type: "search",
  resource: "smart-list",
  title: "List Smart Lists",
  description:
    "List saved Smart Lists, whose ids drive the Smart list id filter on Search People. Turn on " +
    "All versions — by default this returns only Smart Lists from the classic UI, which on a " +
    "modern account is often none of them.",
  params: [
    {
      key: "all",
      label: "All versions",
      type: "boolean",
      hint: "Return Smart Lists from both the classic and current Follow Up Boss UI. Almost " +
        "always what you want: without it, only classic ones come back.",
    },
    {
      key: "fub2",
      label: "Current UI only",
      type: "boolean",
      advanced: true,
      hint: "Return only Smart Lists created in the current UI, instead of only classic ones.",
    },
    ...PAGE_PARAMS,
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx): Promise<FubList> {
    return new FubClient(ctx).list("/smartLists", {
      query: { ...pageQuery(input), all: input.all, fub2: input.fub2 },
    });
  },
};

export default listSmartLists;
