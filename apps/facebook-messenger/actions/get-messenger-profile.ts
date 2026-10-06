import type { ActionDefinition } from "@w6w/types";
import { MessengerClient, requireString } from "../lib/client.ts";

interface Input {
  fields: string;
}

/**
 * Read Messenger Profile properties — `GET /me/messenger_profile?fields=…`. The values come
 * back in a `data` array of one object. Property names: get_started, greeting,
 * ice_breakers, persistent_menu, whitelisted_domains, account_linking_url, commands and
 * subject_to_new_eu_privacy_rules (read-only).
 *
 * Rate limit: 10 Messenger Profile API calls per 10 minutes, per Page.
 */
const getMessengerProfile: ActionDefinition<Input, { data: Record<string, unknown>[] }> = {
  key: "get-messenger-profile",
  type: "read",
  resource: "profile",
  title: "Get Messenger Profile",
  description:
    "Read the Page's greeting, Get Started button, ice breakers, persistent menu and other profile properties.",
  params: [
    {
      key: "fields",
      label: "Properties",
      type: "string",
      required: true,
      default: "greeting,get_started,ice_breakers,persistent_menu",
      hint:
        "Comma-separated: get_started, greeting, ice_breakers, persistent_menu, whitelisted_domains, account_linking_url, commands.",
    },
  ],
  output: [{ key: "data", type: "array", label: "Profile properties" }],

  execute(input, ctx) {
    return new MessengerClient(ctx).request<{ data: Record<string, unknown>[] }>(
      "/me/messenger_profile",
      { query: { fields: requireString("fields", input.fields) } },
    );
  },
};

export default getMessengerProfile;
