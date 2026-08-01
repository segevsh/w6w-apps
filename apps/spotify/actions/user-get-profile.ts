import type { ActionDefinition } from "@w6w/types";
import { SpotifyClient } from "../lib/client.ts";

/**
 * Get detailed profile information about the current (authenticated) user.
 * https://developer.spotify.com/documentation/web-api/reference/get-current-users-profile
 * (checked 2026-08-01). Requires `user-read-private` for subscription
 * details and `user-read-email` for the email address; both are on the
 * `oauth2` auth method.
 */
const userGetProfile: ActionDefinition<Record<string, never>> = {
  key: "user-get-profile",
  type: "read",
  resource: "user",
  title: "Get Current User Profile",
  description: "Get the connected Spotify account's profile.",
  params: [],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "display_name", type: "string", label: "Display name" },
    { key: "email", type: "string", label: "Email" },
    { key: "country", type: "string", label: "Country" },
    { key: "product", type: "string", label: "Subscription tier" },
    { key: "followers", type: "object", label: "Followers" },
    { key: "images", type: "array", label: "Images" },
    { key: "external_urls", type: "object", label: "External URLs" },
  ],

  execute(_input, ctx) {
    return new SpotifyClient(ctx).request("/me");
  },
};

export default userGetProfile;
