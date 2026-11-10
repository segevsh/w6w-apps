import type { TriggerDefinition } from "@w6w/types";
import listAgents from "../actions/list-agents.ts";
import { newRecords } from "../lib/snapshot.ts";

/**
 * `list_agents` returns every agent of the license in one unpaginated array
 * (https://platform.text.com/docs/management/configuration-api, "List Agents"), so each check
 * diffs the agent ids (their e-mail addresses) against the previous check.
 */
const trigger: TriggerDefinition = {
  key: "new-agent",
  title: "New Agent",
  description: "The run gets each agent newly added to the LiveChat license.",
  minIntervalMs: 300_000,
  output: [
    { key: "id", type: "string", label: "Agent ID (e-mail)" },
    { key: "name", type: "string", label: "Name" },
    { key: "role", type: "string", label: "Role" },
    { key: "login_status", type: "string", label: "Login status" },
  ],
  sample: { id: "jones@example.com", name: "Jones", role: "normal", login_status: "offline" },
  async poll({ state }, ctx) {
    const out = await listAgents.execute({}, ctx) as { items: unknown[] };
    return await newRecords(state, out.items, (a) => String((a as { id?: unknown }).id ?? ""));
  },
};

export default trigger;
