import type { ActionDefinition } from "@w6w/types";
import { OutsetaClient, pathId } from "../lib/client.ts";

interface Input {
  personUid: string;
  fields?: string;
}

/** `GET /api/v1/crm/people/{personUid}` — Retrieve one person by Uid, including their account memberships. */
const getPerson: ActionDefinition<Input> = {
  key: "get-person",
  type: "read",
  resource: "person",
  title: "Get Person",
  description: "Retrieve one person by Uid, including their account memberships.",
  params: [
    {
      key: "personUid",
      label: "Person Uid",
      type: "string",
      hint: "The person's Uid (the short alphanumeric id, e.g. `wZmNZm2O`).",
      required: true,
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      hint: "Comma-separated property paths to return, e.g. `Uid,Email,PersonAccount.*`.",
      advanced: true,
    },
  ],
  output: [
    {
      key: "Uid",
      type: "string",
      label: "Uid",
    },
    {
      key: "Created",
      type: "string",
      label: "Created",
    },
    {
      key: "Updated",
      type: "string",
      label: "Updated",
    },
  ],

  execute(input, ctx) {
    return OutsetaClient.fromConnection(ctx).request(`/crm/people/${pathId(input.personUid)}`, {
      method: "GET",
      query: { fields: input.fields },
    });
  },
};

export default getPerson;
