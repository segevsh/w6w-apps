import type { TriggerDefinition } from "@w6w/types";
import listGroups from "../actions/list-groups.ts";
import { newRecords } from "../lib/snapshot.ts";

/**
 * `list_groups` returns every group of the license in one unpaginated array
 * (https://platform.text.com/docs/management/configuration-api, "List Groups"), so each check
 * diffs the group ids (integers, 0 is the default group) against the previous check.
 */
const trigger: TriggerDefinition = {
  key: "new-group",
  title: "New Group",
  description: "The run gets each group newly created in the LiveChat license.",
  minIntervalMs: 300_000,
  output: [
    { key: "id", type: "number", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "language_code", type: "string", label: "Language code" },
  ],
  sample: { id: 19, name: "Sport shoes", language_code: "en" },
  async poll({ state }, ctx) {
    const out = await listGroups.execute({}, ctx) as { items: unknown[] };
    return await newRecords(state, out.items, (g) => String((g as { id?: unknown }).id ?? ""));
  },
};

export default trigger;
