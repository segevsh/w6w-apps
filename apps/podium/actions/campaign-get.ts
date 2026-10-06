import type { ActionDefinition } from "@w6w/types";
import { encodeId, PodiumClient } from "../lib/client.ts";

interface Input {
  uid: string;
}

const campaignGet: ActionDefinition<Input> = {
  key: "campaign-get",
  type: "read",
  resource: "campaign",
  title: "Get Campaign",
  description: "Get one campaign by uid. Requires scope `read_campaigns`.",
  params: [{
    key: "uid",
    label: "Campaign UID",
    type: "string",
    required: true,
  }],
  output: [{
    key: "createdAt",
    type: "string",
    label: "Time at which the resource was created. Date time is in Coordinated Un",
  }, {
    key: "endedAt",
    type: "string",
    label: "Time at which the campaign completed, stopped or errored. Date time is",
  }, {
    key: "locations",
    type: "array",
    label: "locations",
  }, {
    key: "message",
    type: "string",
    label: "The message sent to subscribers",
  }, {
    key: "name",
    type: "string",
    label: "Name of the campaign",
  }, {
    key: "organization",
    type: "object",
    label: "Reference to the organization resource",
  }, {
    key: "startedAt",
    type: "string",
    label: "Time at which the campaign messsages started sending. Date time is in ",
  }, {
    key: "status",
    type: "string",
    label: "The current campaign status",
  }, {
    key: "uid",
    type: "string",
    label: "Podium unique identifier for campaign",
  }, {
    key: "updatedAt",
    type: "string",
    label: "Time at which the resource was updated. Date time is in Coordinated Un",
  }],

  execute(input, ctx) {
    return new PodiumClient(ctx).one(`/campaigns/${encodeId(input.uid)}`);
  },
};

export default campaignGet;
