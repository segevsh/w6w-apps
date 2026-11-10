import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import agentList from "../actions/agent-list.ts";

const trigger: TriggerDefinition = {
  key: "new-agent",
  title: "New Agent",
  description:
    "The run gets each PhantomBuster agent (phantom) newly created in the organization (renames and removals are ignored).",
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Agent ID" },
    { key: "values", type: "object", label: "Agent" },
  ],
  sample: {
    change: "added",
    key: "1234567890",
    values: { id: "1234567890", name: "LinkedIn Profile Scraper" },
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const result = await agentList.execute({}, ctx);
    const rows = ((result as { agents?: unknown[] }).agents ?? []) as Array<
      { id?: string; [key: string]: unknown }
    >;
    return await pollSnapshot({
      state,
      rows: rows.flatMap((row) => row.id ? [{ key: row.id, values: row }] : []),
      emit: { added: true, updated: false },
      maxRows: 5000,
    });
  },
};

export default trigger;
