import type { ActionDefinition } from "@w6w/types";
import { encodeId, PodiumClient } from "../lib/client.ts";

interface Input {
  uid: string;
}

const locationGet: ActionDefinition<Input> = {
  key: "location-get",
  type: "read",
  resource: "location",
  title: "Get Location",
  description: "Get one location by uid. Requires scope `read_locations`.",
  params: [{
    key: "uid",
    label: "Location UID",
    type: "string",
    required: true,
  }],
  output: [{
    key: "addressDetails",
    type: "object",
    label: "Details of the address such as state, country, postal code, etc",
  }, {
    key: "archived",
    type: "boolean",
    label: "If the location has been archived",
  }, {
    key: "archivedAt",
    type: "string",
    label: "When the location was archived",
  }, {
    key: "createdAt",
    type: "string",
    label: "When the location was created",
  }, {
    key: "displayName",
    type: "string",
    label: "Name of the location that is displayed in the user interface",
  }, {
    key: "name",
    type: "string",
    label: "Name of the location",
  }, {
    key: "organizationUid",
    type: "string",
    label: "Podium unique identifier for organization",
  }, {
    key: "phoneNumber",
    type: "string",
    label: "Phone number of the location",
  }, {
    key: "podiumPhoneNumber",
    type: "string",
    label: "Podium phone number of the location",
  }, {
    key: "uid",
    type: "string",
    label: "Podium unique identifier for location",
  }, {
    key: "updatedAt",
    type: "string",
    label: "When the location was updated",
  }],

  execute(input, ctx) {
    return new PodiumClient(ctx).one(`/locations/${encodeId(input.uid)}`);
  },
};

export default locationGet;
