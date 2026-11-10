import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import { PROJECT_PARAM } from "../lib/params.ts";
import action from "../actions/environment-variable-list.ts";

/**
 * `environment-variable-list` answers `{ variables: { NAME: { <environment>: { value } } } }` for
 * one project. A variable has no id of its own at the project level, so the NAME is the key;
 * the event carries the name and the environments that define it, never a value (dbt masks
 * secrets, and a workflow has no use for the others here).
 */
const trigger: TriggerDefinition<{ projectId: string }> = {
  key: "new-environment-variable",
  title: "New Environment Variable",
  description:
    "The run gets each environment variable newly defined in the chosen project (names only, never values).",
  params: [PROJECT_PARAM],
  minIntervalMs: 300_000,
  output: [
    { key: "name", type: "string", label: "Variable name" },
    { key: "environments", type: "array", label: "Environments that define it" },
    { key: "secret", type: "boolean", label: "dbt masked its value" },
  ],
  sample: { name: "DBT_WAREHOUSE", environments: ["project", "Production"], secret: false },
  async poll({ state, params }, ctx) {
    const res = await action.execute({ projectId: params.projectId }, ctx) as {
      variables?: Record<string, Record<string, unknown>>;
      secretNames?: string[];
    };
    const variables = res.variables ?? {};
    const secrets = new Set(res.secretNames ?? []);
    const { events, nextState } = await pollSnapshot({
      state,
      rows: Object.keys(variables).map((name) => ({ key: name, values: { name } })),
      emit: { added: true, updated: false },
    });
    return {
      events: events.map((e) => ({
        name: e.key,
        environments: Object.keys(variables[e.key] ?? {}),
        secret: secrets.has(e.key),
      })),
      nextState,
    };
  },
};

export default trigger;
