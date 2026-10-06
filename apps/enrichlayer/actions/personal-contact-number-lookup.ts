import type { ActionDefinition } from "@w6w/types";
import { EnrichLayerClient } from "../lib/client.ts";

interface Input {
  profileUrl?: string;
  twitterProfileUrl?: string;
  facebookProfileUrl?: string;
  pageSize?: number;
}

/** `GET /contact-api/personal-contact` */
const personalContactNumberLookup: ActionDefinition<Input> = {
  key: "personal-contact-number-lookup",
  type: "read",
  resource: "contact",
  title: "Find Personal Phone Numbers",
  description: "Find personal phone numbers for a social profile (1 credit per number returned).",
  params: [
    {
      key: "profileUrl",
      label: "Profile URL",
      type: "string",
      hint:
        "Public profile URL. One of the profile URL, Twitter/X URL or Facebook URL is required.",
    },
    {
      key: "twitterProfileUrl",
      label: "Twitter/X profile URL",
      type: "string",
      hint: "Format https://x.com/<public-identifier>.",
    },
    {
      key: "facebookProfileUrl",
      label: "Facebook profile URL",
      type: "string",
      hint: "Format https://facebook.com/<public-identifier>.",
    },
    {
      key: "pageSize",
      label: "Max numbers",
      type: "number",
      hint: "0 (default) means no limit; use it to cap credit spend.",
    },
  ],
  output: [
    { key: "numbers", type: "array", label: "Phone numbers" },
  ],

  async execute(input, ctx) {
    const res = await new EnrichLayerClient(ctx).get("/contact-api/personal-contact", {
      profile_url: input.profileUrl,
      twitter_profile_url: input.twitterProfileUrl,
      facebook_profile_url: input.facebookProfileUrl,
      page_size: input.pageSize,
    });
    return {
      numbers: (res as { numbers?: string[] }).numbers ?? [],
    };
  },
};

export default personalContactNumberLookup;
