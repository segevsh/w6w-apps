import type { ActionDefinition } from "@w6w/types";
import { WebexClient } from "../lib/client.ts";

interface Input {
  callingData?: boolean;
}

const getMyOwnDetails: ActionDefinition<Input> = {
  key: "get-my-own-details",
  type: "read",
  resource: "person",
  title: "Get My Own Details",
  description: "Get the profile of the person this connection authenticates as.",
  params: [
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
    return new WebexClient(ctx).request("/people/me", {
      query: { callingData: input.callingData },
    });
  },
};

export default getMyOwnDetails;
