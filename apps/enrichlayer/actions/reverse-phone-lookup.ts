import type { ActionDefinition } from "@w6w/types";
import { EnrichLayerClient } from "../lib/client.ts";

interface Input {
  phoneNumber: string;
}

/** `GET /resolve/phone` */
const reversePhoneLookup: ActionDefinition<Input> = {
  key: "reverse-phone-lookup",
  type: "read",
  resource: "contact",
  title: "Reverse Phone Lookup",
  description: "Find social profiles from a phone number (3 credits).",
  params: [
    {
      key: "phoneNumber",
      label: "Phone number",
      type: "string",
      required: true,
      hint: "E.164 format, for example +14155552671.",
    },
  ],
  output: [
    { key: "linkedinProfileUrl", type: "string", label: "Profile URL" },
    { key: "twitterProfileUrl", type: "string", label: "Twitter/X URL" },
    { key: "facebookProfileUrl", type: "string", label: "Facebook URL" },
  ],

  async execute(input, ctx) {
    const res = await new EnrichLayerClient(ctx).get("/resolve/phone", {
      phone_number: input.phoneNumber,
    });
    return {
      linkedinProfileUrl: (res as { linkedin_profile_url?: string | null }).linkedin_profile_url ??
        null,
      twitterProfileUrl: (res as { twitter_profile_url?: string | null }).twitter_profile_url ??
        null,
      facebookProfileUrl: (res as { facebook_profile_url?: string | null }).facebook_profile_url ??
        null,
    };
  },
};

export default reversePhoneLookup;
