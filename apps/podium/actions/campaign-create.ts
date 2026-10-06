import type { ActionDefinition } from "@w6w/types";
import { compact, PodiumClient, toList } from "../lib/client.ts";

interface Input {
  name: string;
  locations: string[] | string;
  status: string;
  message?: string;
  includeActiveConversations?: boolean;
  recentlySentSubscriberOverride?: boolean;
}

const campaignCreate: ActionDefinition<Input> = {
  key: "campaign-create",
  type: "perform",
  resource: "campaign",
  title: "Create Campaign",
  description: "Create an automated campaign. Requires scope `write_campaigns`.",
  idempotent: false,
  params: [{
    key: "name",
    label: "Name",
    type: "string",
    required: true,
  }, {
    key: "locations",
    label: "Location UIDs",
    type: "string",
    required: true,
    hint: "Comma-separated.",
  }, {
    key: "status",
    label: "Status",
    type: "select",
    required: true,
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
  }, {
    key: "message",
    label: "Message",
    type: "text",
  }, {
    key: "includeActiveConversations",
    label: "Include active conversations",
    type: "boolean",
  }, {
    key: "recentlySentSubscriberOverride",
    label: "Override recently-sent suppression",
    type: "boolean",
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
    return new PodiumClient(ctx).one("/campaigns", {
      method: "POST",
      body: compact({
        name: input.name,
        locations: toList(input.locations),
        status: input.status,
        message: input.message,
        includeActiveConversations: input.includeActiveConversations,
        recentlySentSubscriberOverride: input.recentlySentSubscriberOverride,
      }),
    });
  },
};

export default campaignCreate;
