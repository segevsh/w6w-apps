import type { ActionDefinition } from "@w6w/types";
import { encodeId, PodiumClient } from "../lib/client.ts";

interface Input {
  uid: string;
}

const organizationGet: ActionDefinition<Input> = {
  key: "organization-get",
  type: "read",
  resource: "organization",
  title: "Get Organization",
  description: "Get one organization by uid. Requires scope `read_organizations`.",
  params: [{
    key: "uid",
    label: "Organization UID",
    type: "string",
    required: true,
  }],
  output: [{
    key: "archived",
    type: "boolean",
    label: "If the organization has been archived",
  }, {
    key: "businessName",
    type: "string",
    label: "Business name of the organization that is displayed in the user interf",
  }, {
    key: "createdAt",
    type: "string",
    label: "When the organization was created",
  }, {
    key: "uid",
    type: "string",
    label: "Podium unique identifier for organization",
  }, {
    key: "updatedAt",
    type: "string",
    label: "When the organization was updated",
  }],

  execute(input, ctx) {
    return new PodiumClient(ctx).one(`/organizations/${encodeId(input.uid)}`);
  },
};

export default organizationGet;
