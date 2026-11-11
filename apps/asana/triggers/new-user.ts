import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listUsers from "../actions/list-users.ts";

interface Params {
  workspace?: string;
}

/**
 * Small bounded collection (brief §9.1 c): `GET /workspaces/{gid}/users` is a grandfathered,
 * unpaginated endpoint — "Results are sorted alphabetically and limited to 2000"
 * (https://developers.asana.com/reference/getusersforworkspace , verified 2026-11-10). Asana sends
 * no workspace-member event that carries the user, so the list is compared check to check.
 * `pollSnapshot` throws past 5000 rows; a response with a `next_page` (more than the endpoint
 * serves) is refused instead of compared, because a partial list would re-announce users.
 */
const trigger: TriggerDefinition<Params> = {
  key: "new-user",
  title: "New User",
  description: "The run gets each user newly added to the Asana workspace (checked on a schedule).",
  params: [{
    key: "workspace",
    label: "Workspace ID",
    type: "string",
    required: true,
    hint: "The workspace or organization to watch.",
  }],
  output: [
    { key: "gid", type: "string", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "resource_type", type: "string", label: "Resource type" },
  ],
  sample: { gid: "1200000000000002", name: "Ada Lovelace", resource_type: "user" },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const workspace = params.workspace?.trim();
    if (!workspace) throw new Error("Set Workspace ID to the Asana workspace to watch.");
    const out = await listUsers.execute({ workspace }, ctx) as {
      data?: Array<{ gid?: unknown }>;
      next_page?: unknown;
    };
    if (out?.next_page) {
      throw new Error(
        "Asana returned more users than one response holds; New User cannot compare a partial list.",
      );
    }
    const users = Array.isArray(out?.data) ? out.data : [];
    const { events, nextState } = await pollSnapshot({
      state,
      rows: users.map((user) => ({ key: String(user.gid ?? ""), values: user })),
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
