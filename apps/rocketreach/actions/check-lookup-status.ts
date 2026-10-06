import type { ActionDefinition } from "@w6w/types";
import { RocketReachClient, toList } from "../lib/client.ts";
import { CHECK_STATUS_OUTPUT, parseIds, statusOutput } from "../lib/profile.ts";

type Input = { ids: string | number[] };

/**
 * `GET /person/checkStatus?ids=…`. The spec types `ids` as an array of integers
 * with no style override, i.e. repeated parameters (`ids=1&ids=2`). The vendor
 * "encourages" webhooks over polling.
 */
const checkLookupStatus: ActionDefinition<Input> = {
  key: "check-lookup-status",
  type: "read",
  resource: "person",
  title: "Check Lookup Status",
  description: "Check whether person lookups have finished and fetch their data. Pass the " +
    "profile IDs returned by Lookup Person or Bulk Lookup People. Status is complete, failed, " +
    "waiting, searching or progress. For Universal Credits accounts use Universal Check " +
    "Lookup Status.",
  params: [
    {
      key: "ids",
      label: "Profile IDs",
      type: "string",
      required: true,
      hint: "Comma-separated RocketReach profile IDs, e.g. 5244, 5245.",
    },
  ],
  output: CHECK_STATUS_OUTPUT,

  async execute(input, ctx) {
    const ids = parseIds(input.ids, toList);
    const { body } = await new RocketReachClient(ctx).request("/person/checkStatus", {
      query: { ids },
    });
    return statusOutput(body);
  },
};

export default checkLookupStatus;
