import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listPolicies from "../actions/list-policies.ts";

/**
 * Small bounded collection: the `get`/`policyList` job answers every policy of the account in one
 * unpaginated response (the Integration Server job has no paging inputs); an account holds a
 * handful of workspaces. The set is diffed each check and only additions are emitted;
 * `pollSnapshot` throws past 5000 rows.
 */
const trigger: TriggerDefinition = {
  key: "new-policy",
  title: "New Policy",
  description: "The run gets each Expensify policy (workspace) newly available to the account.",
  output: [
    { key: "id", type: "string", label: "Policy ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Type" },
    { key: "owner", type: "string", label: "Owner email" },
    { key: "outputCurrency", type: "string", label: "Currency" },
  ],
  sample: {
    id: "DEADBEEF12345678",
    name: "Acme USA",
    type: "corporate",
    owner: "a@acme.com",
    role: "admin",
    outputCurrency: "USD",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const out = await listPolicies.execute({}, ctx) as { policyList?: Array<{ id?: unknown }> };
    const policies = Array.isArray(out?.policyList) ? out.policyList : [];
    const { events, nextState } = await pollSnapshot({
      state,
      rows: policies.map((policy) => ({ key: String(policy.id ?? ""), values: policy })),
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
