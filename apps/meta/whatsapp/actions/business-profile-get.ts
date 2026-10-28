import type { ActionDefinition } from "@w6w/types";
import { WhatsAppClient } from "../lib/client.ts";

/** No required params — safe to invoke with `{}`. */
const businessProfileGet: ActionDefinition<Record<string, never>> = {
  key: "business-profile-get",
  type: "read",
  resource: "business-profile",
  title: "Get Business Profile",
  description:
    "Read this phone number's WhatsApp Business profile (about, address, hours-adjacent fields, etc).",
  params: [],
  output: [
    {
      key: "data",
      type: "array",
      label:
        "Business profile (single-element array: about, address, description, email, profile_picture_url, websites, vertical)",
    },
  ],

  execute(_input, ctx) {
    return new WhatsAppClient(ctx).getBusinessProfile();
  },
};

export default businessProfileGet;
