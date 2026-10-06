import type { ActionDefinition } from "@w6w/types";
import { RocketReachClient, toList } from "../lib/client.ts";
import { CHECK_STATUS_OUTPUT, parseIds, statusOutput } from "../lib/profile.ts";

type Input = { ids: string | number[] };

/**
 * `GET /universal/person/check_status?ids=…` (Universal Credits accounts only). The spec
 * types `ids` as an array of integers with no style override, i.e. repeated parameters (`ids=1&ids=2`). The vendor
 * "encourages" webhooks over polling.
 */
const universalCheckLookupStatus: ActionDefinition<Input> = {
  key: "universal-check-lookup-status",
  type: "read",
  resource: "person",
  title: "Universal Check Lookup Status",
  description: "Universal Credits version of Check Lookup Status: check whether person lookups " +
    "have finished and fetch their data. Pass the profile IDs returned by Universal Lookup Person " +
    "or Universal Bulk Lookup People. Status is complete, failed, waiting, searching or progress.",
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
    const { body } = await new RocketReachClient(ctx).request("/universal/person/check_status", {
      query: { ids },
    });
    return statusOutput(body);
  },
};

export default universalCheckLookupStatus;
