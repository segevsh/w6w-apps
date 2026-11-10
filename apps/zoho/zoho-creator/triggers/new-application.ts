import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import applicationList from "../actions/application-list.ts";

const trigger: TriggerDefinition = {
  key: "new-application",
  title: "New Application",
  description: "The run gets each Zoho Creator application newly available to the connection.",
  output: [{ key: "link_name", type: "string", label: "Application link name" }],
  sample: { link_name: "orders", workspace_name: "acme" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const result = await applicationList.execute({}, ctx) as {
      applications?: Array<Record<string, unknown>>;
    };
    const { events, nextState } = await pollSnapshot({
      state,
      maxRows: 5000,
      emit: { added: true, updated: false, removed: false },
      rows: (result.applications ?? []).map((item) => ({
        key: `${item.workspace_name ?? ""}:${item.link_name ?? item.id ?? ""}`,
        values: item,
      })),
    });
    return { events: events.map((event) => event.values), nextState };
  },
};
export default trigger;
