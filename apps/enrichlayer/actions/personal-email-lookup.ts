import type { ActionDefinition } from "@w6w/types";
import { EnrichLayerClient } from "../lib/client.ts";

interface Input {
  profileUrl?: string;
  twitterProfileUrl?: string;
  facebookProfileUrl?: string;
  emailValidation?: string;
  pageSize?: number;
}

/** `GET /contact-api/personal-email` */
const personalEmailLookup: ActionDefinition<Input> = {
  key: "personal-email-lookup",
  type: "read",
  resource: "contact",
  title: "Find Personal Emails",
  description:
    "Find personal email addresses for a social profile (1 credit per email returned; precise validation costs 1 more per email).",
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
      key: "emailValidation",
      label: "Email validation",
      type: "select",
      hint: "fast is free; precise checks deliverability for 1 extra credit per email.",
      options: [{ value: "none", label: "none" }, { value: "fast", label: "fast" }, {
        value: "precise",
        label: "precise",
      }],
    },
    {
      key: "pageSize",
      label: "Max emails",
      type: "number",
      hint: "0 (default) means no limit; use it to cap credit spend.",
    },
  ],
  output: [
    { key: "emails", type: "array", label: "Email addresses" },
    { key: "invalidEmails", type: "array", label: "Addresses that failed validation" },
  ],

  async execute(input, ctx) {
    const res = await new EnrichLayerClient(ctx).get("/contact-api/personal-email", {
      profile_url: input.profileUrl,
      twitter_profile_url: input.twitterProfileUrl,
      facebook_profile_url: input.facebookProfileUrl,
      email_validation: input.emailValidation,
      page_size: input.pageSize,
    });
    return {
      emails: (res as { emails?: string[] }).emails ?? [],
      invalidEmails: (res as { invalid_emails?: string[] }).invalid_emails ?? [],
    };
  },
};

export default personalEmailLookup;
