import type { ActionDefinition } from "@w6w/types";
import { HibobClient } from "../lib/client.ts";

/**
 * `GET /v1/profiles` — the public-profile section (name, email, about, work) of
 * every ACTIVE employee the service user can see. A fixed field set; use People
 * Search when you need to choose fields or include inactive staff. Limit 40/min.
 */
const profilesList: ActionDefinition<Record<string, never>> = {
  key: "profiles-list",
  type: "read",
  resource: "employee",
  title: "List Public Profiles",
  description: "Read the public profile section of all active employees the service user can see.",
  params: [],
  output: [{ key: "employees", type: "object", label: "Public profiles" }],

  async execute(_input, ctx) {
    return await new HibobClient(ctx).get("/profiles");
  },
};

export default profilesList;
