import type { ActionDefinition } from "@w6w/types";
import { FareHarborClient } from "../lib/client.ts";
import { companyParam, seg } from "../lib/params.ts";

interface Input {
  shortname: string;
}

const checkinStatusList: ActionDefinition<Input> = {
  key: "checkin-status-list",
  type: "read",
  resource: "checkin-status",
  title: "List Check-in Statuses",
  description: "List the check-in statuses a company has defined.",
  params: [
    companyParam,
  ],
  output: [
    { key: "checkin_statuses", type: "array", label: "Records" },
  ],

  execute(input, ctx) {
    return new FareHarborClient(ctx).get(
      `/companies/${seg(input.shortname, "shortname")}/checkin-statuses/`,
    );
  },
};

export default checkinStatusList;
