import type { ActionDefinition } from "@w6w/types";
import { WebexClient } from "../lib/client.ts";

interface Input {
  personId: string;
  callingData?: boolean;
}

const getPerson: ActionDefinition<Input> = {
  key: "get-person",
  type: "read",
  resource: "person",
  title: "Get Person",
  description: "Get the profile of another person, by ID.",
  params: [
    { key: "personId", label: "Person ID", type: "string", required: true },
    {
      key: "callingData",
      label: "Include Webex Calling details",
      type: "boolean",
      hint: "Only meaningful for a person with a Webex Calling license.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Person ID" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "emails", type: "array", label: "Emails" },
  ],

  execute(input, ctx) {
    return new WebexClient(ctx).request(`/people/${encodeURIComponent(input.personId)}`, {
      query: { callingData: input.callingData },
    });
  },
};

export default getPerson;
