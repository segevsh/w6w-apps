import type { TriggerDefinition } from "@w6w/types";
import { pollSites } from "../lib/snapshots.ts";

const trigger: TriggerDefinition = {
  key: "new-site",
  title: "New Site",
  description:
    "Fires when a site appears in the account (up to 1000 sites are watched). The run gets the new site.",
  params: [],
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Site ID" },
    { key: "values", type: "object", label: "Site" },
  ],
  sample: {
    change: "added",
    key: "1f2e3d4c-5b6a-7980-a1b2-c3d4e5f60718",
    values: { id: "1f2e3d4c-5b6a-7980-a1b2-c3d4e5f60718", name: "my-site" },
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    return await pollSites(state, ctx);
  },
};

export default trigger;
