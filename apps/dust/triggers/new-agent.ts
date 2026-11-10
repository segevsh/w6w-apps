import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import agentList from "../actions/agent-list.ts";

/**
 * Small bounded collection: `GET /assistant/agent_configurations` answers the workspace's whole
 * agent set in one unpaginated response (the OpenAPI document defines no paging parameters), so
 * the set is diffed each check and only additions are emitted. `pollSnapshot` throws past 5000.
 */
const trigger: TriggerDefinition = {
  key: "new-agent",
  title: "New Agent",
  description: "The run gets each agent newly available in the Dust workspace.",
  output: [
    { key: "sId", type: "string", label: "Agent ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "scope", type: "string", label: "Scope" },
  ],
  sample: {
    sId: "agt_abc123",
    name: "Support",
    description: "Answers support questions",
    scope: "workspace",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const out = await agentList.execute({ view: "list" }, ctx) as {
      agentConfigurations?: Array<{ sId?: unknown }>;
    };
    const agents = Array.isArray(out?.agentConfigurations) ? out.agentConfigurations : [];
    const { events, nextState } = await pollSnapshot({
      state,
      rows: agents.map((agent) => ({ key: String(agent.sId ?? ""), values: agent })),
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
