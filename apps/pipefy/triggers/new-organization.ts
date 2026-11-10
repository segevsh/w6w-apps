import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import organizationList from "../actions/organization-list.ts";

/**
 * `organization-list`: `{ organizations { id name } }` with no argument lists every organization the
 * connected account can see (https://developers.pipefy.com/reference/organizations, verified
 * 2026-11-10). Bounded: an account belongs to a handful of organizations. Additions only.
 */
const trigger: TriggerDefinition = {
  key: "new-organization",
  title: "New Organization",
  description:
    "The run gets each Pipefy organization the connected account newly gains access to (renames and removals are ignored).",
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Organization ID" },
    { key: "values", type: "object", label: "Organization" },
  ],
  sample: {
    change: "added",
    key: "12345",
    values: { id: "12345", name: "Acme" },
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const result = await organizationList.execute({}, ctx) as {
      organizations?: Array<{ id?: string; [key: string]: unknown }>;
    };
    return await pollSnapshot({
      state,
      rows: (result.organizations ?? []).flatMap((row) =>
        row.id ? [{ key: String(row.id), values: row }] : []
      ),
      emit: { added: true, updated: false },
      maxRows: 5000,
    });
  },
};

export default trigger;
