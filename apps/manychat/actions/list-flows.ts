import type { ActionDefinition } from "@w6w/types";
import {
  ManychatClient,
  type ManychatEnvelope,
  type ManychatFlow,
  type ManychatFolder,
} from "../lib/client.ts";

/**
 * Every Automation (Flow) on the Page, plus the folder tree they live in.
 *
 * `GET /fb/page/getFlows` → `{ status, data: { flows: [{ ns, name, folder_id }],
 * folders: [{ id, name, parent_id }] } }`. Two arrays under one `data`, unlike
 * the other list endpoints which return a bare array.
 *
 * **`ns` is the id `send-flow` needs**, not a numeric one. The spec calls it the
 * "Automation namespace — unique Automation ID". Flows are the *only* first-class
 * object in this API keyed by an opaque string rather than an integer, and
 * `sendFlow`'s `flow_ns` parameter is typed `string` accordingly. This action is
 * the only published way to discover one, which makes it the natural first step
 * of any send-a-flow workflow.
 *
 * Manychat's UI renamed "Flows" to "Automations"; the API kept the old noun in
 * both the path and the field name. Both words appear here so a search for either
 * finds this.
 *
 * Its documented limit is 10 queries per second — an order of magnitude below the
 * other page reads, which is a hint that this is the expensive one. Resolve a
 * flow's `ns` once and reuse it rather than listing on every run.
 */
const listFlows: ActionDefinition<Record<string, never>> = {
  key: "list-flows",
  type: "read",
  resource: "flow",
  title: "List Flows (Automations)",
  description:
    "Every Automation on the Page plus its folder tree (GET /fb/page/getFlows). Returns " +
    "`data.flows` and `data.folders`. A flow's `ns` is the id Send Flow takes.",
  params: [],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "data", type: "object", label: "`{ flows, folders }`" },
  ],

  execute(_input, ctx) {
    return new ManychatClient(ctx).get<
      ManychatEnvelope<{ flows?: ManychatFlow[]; folders?: ManychatFolder[] }>
    >("/fb/page/getFlows");
  },
};

export default listFlows;
