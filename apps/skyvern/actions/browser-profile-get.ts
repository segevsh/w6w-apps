import type { ActionDefinition } from "@w6w/types";
import { SkyvernClient } from "../lib/client.ts";
import { profileIdParam } from "../lib/params.ts";

/** `GET /v1/browser_profiles/{profile_id}` */
interface Input {
  profileId: string;
}

const browserProfileGet: ActionDefinition<Input> = {
  key: "browser-profile-get",
  type: "read",
  resource: "browser-profile",
  title: "Get Browser Profile",
  description: "Fetch one saved browser profile.",
  params: [profileIdParam],
  output: [
    { key: "browser_profile_id", type: "string", label: "Browser profile ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "is_managed", type: "boolean", label: "Auto-managed" },
    { key: "last_verified_login_at", type: "string", label: "Last verified login at" },
    { key: "created_at", type: "string", label: "Created at" },
  ],

  execute(input, ctx) {
    return new SkyvernClient(ctx).json(
      `/v1/browser_profiles/${encodeURIComponent(input.profileId)}`,
    );
  },
};

export default browserProfileGet;
