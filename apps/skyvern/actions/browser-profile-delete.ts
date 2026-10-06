import type { ActionDefinition } from "@w6w/types";
import { SkyvernClient } from "../lib/client.ts";
import { profileIdParam } from "../lib/params.ts";

/** `DELETE /v1/browser_profiles/{profile_id}` — answers 204. */
interface Input {
  profileId: string;
}

const browserProfileDelete: ActionDefinition<Input> = {
  key: "browser-profile-delete",
  type: "perform",
  resource: "browser-profile",
  title: "Delete Browser Profile",
  description: "Delete a saved browser profile.",
  idempotent: true,
  params: [profileIdParam],
  output: [
    { key: "success", type: "boolean", label: "Deleted" },
    { key: "browser_profile_id", type: "string", label: "Browser profile ID" },
  ],

  async execute(input, ctx) {
    await new SkyvernClient(ctx).json(
      `/v1/browser_profiles/${encodeURIComponent(input.profileId)}`,
      { method: "DELETE" },
    );
    return { success: true, browser_profile_id: input.profileId };
  },
};

export default browserProfileDelete;
