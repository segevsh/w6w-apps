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
  ids?: string;
  status?: string;
  sort?: string;
}

/**
 * `GET /actionPlans` — the account's follow-up sequences.
 *
 * An Action Plan is Follow Up Boss's drip/nurture sequence, and its id is what
 * Apply Action Plan needs. This action exists to resolve that id by name, since
 * plans are per-account and created in the UI.
 *
 * Note `_metadata.collection` on this endpoint is `actionPlans`, camel-cased and
 * matching the path — unlike `/customFields` and `/smartLists`, which lower-case
 * theirs. That inconsistency is precisely why `lib/client.ts` reads the key from
 * the metadata rather than deriving it.
 *
 * ## Deprecation, stated because the vendor states it
 *
 * The endpoint carries a notice: "This endpoint is planned for deprecation as
 * part of the Automations 2.0 rollout. While no date has been set, we will
 * provide a clear migration path shortly." It still works, no date is set, and
 * there is no replacement to point at yet — so it is shipped with the warning
 * attached rather than omitted. Follow Up Boss's newer `/automations` and
 * `/automationsPeople` endpoints are the presumptive successor; see the README's
 * note on what is deliberately not built.
 *
 * `names[]` is documented as an array-format parameter
 * (`?names[]=A&names[]=B`) with its own encoding rules. It is not exposed here —
 * `ids` and `status` cover the practical cases, and a param whose serialisation
 * this client does not natively produce would be a bug waiting to be filed.
 */
const listActionPlans: ActionDefinition<Input> = {
  key: "list-action-plans",
  type: "search",
  resource: "action-plan",
  title: "List Action Plans",
  description:
    "List the account's Action Plans (follow-up drip sequences) to resolve the id that Apply " +
    "Action Plan needs. Follow Up Boss has flagged this endpoint for eventual deprecation under " +
    "Automations 2.0, with no date set and no migration path published yet.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "Active", label: "Active" },
        { value: "Deleted", label: "Deleted" },
        { value: "Active,Deleted", label: "Active and deleted" },
      ],
      hint: "Filter by plan status.",
    },
    {
      key: "ids",
      label: "Ids",
      type: "string",
      advanced: true,
      hint: "Comma-separated action plan ids, e.g. `287564,67484`.",
    },
    {
      key: "sort",
      label: "Sort",
      type: "select",
      advanced: true,
      options: [
        { value: "id", label: "Id" },
        { value: "name", label: "Name" },
      ],
    },
    ...PAGE_PARAMS,
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx): Promise<FubList> {
    return new FubClient(ctx).list("/actionPlans", {
      query: { ...pageQuery(input), ids: input.ids, status: input.status, sort: input.sort },
    });
  },
};

export default listActionPlans;
