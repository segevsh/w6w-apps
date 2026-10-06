import type { ActionDefinition } from "@w6w/types";
import { PodiumClient } from "../lib/client.ts";

interface Input {
  status?: string;
}

const campaignList: ActionDefinition<Input> = {
  key: "campaign-list",
  type: "read",
  resource: "campaign",
  title: "List Campaigns",
  description:
    "List automated campaigns (the only kind the API manages), most recently updated first. Requires scope `read_campaigns`.",
  params: [{
    key: "status",
    label: "Status",
    type: "select",
    options: [{
      value: "ACTIVE",
      label: "ACTIVE",
    }, {
      value: "COMPLETED",
      label: "COMPLETED",
    }, {
      value: "DRAFT",
      label: "DRAFT",
    }, {
      value: "ERROR",
      label: "ERROR",
    }, {
      value: "INACTIVE",
      label: "INACTIVE",
    }, {
      value: "IN_PROGRESS",
      label: "IN_PROGRESS",
    }, {
      value: "SCHEDULED",
      label: "SCHEDULED",
    }, {
      value: "STOPPED",
      label: "STOPPED",
    }, {
      value: "SUSPENDED",
      label: "SUSPENDED",
    }, {
      value: "ARCHIVED",
      label: "ARCHIVED",
    }],
  }],
  output: [{
    key: "items",
    type: "array",
    label: "Items",
  }, {
    key: "nextCursor",
    type: "string",
    label: "Cursor for the next page (null on the last page)",
  }],

  execute(input, ctx) {
    return new PodiumClient(ctx).list("/campaigns", {
      query: {
        status: input.status,
      },
    });
  },
};

export default campaignList;
