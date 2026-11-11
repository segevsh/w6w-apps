import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listSites from "../actions/list-sites.ts";

/**
 * `list-sites`: `GET /sites` lists every site the token can access in one response with no
 * paging arguments (https://developers.webflow.com/data/reference/sites/list, verified
 * 2026-11-10); a token reaches a handful of sites. Additions only.
 */
const trigger: TriggerDefinition = {
  key: "new-site",
  title: "New Site",
  description:
    "The run gets each Webflow site the connection newly gains access to (renames and removals are ignored).",
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Site ID" },
    { key: "values", type: "object", label: "Site" },
  ],
  sample: {
    change: "added",
    key: "562ac0395358780a1f5e6fbd",
    values: { id: "562ac0395358780a1f5e6fbd", displayName: "My Site", shortName: "my-site" },
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const result = await listSites.execute({}, ctx) as {
      sites?: Array<{ id?: string; [key: string]: unknown }>;
    };
    return await pollSnapshot({
      state,
      rows: (result.sites ?? []).flatMap((s) => s.id ? [{ key: String(s.id), values: s }] : []),
      emit: { added: true, updated: false },
      maxRows: 5000,
    });
  },
};

export default trigger;
