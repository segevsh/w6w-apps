import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listJobs from "../actions/list-jobs.ts";

/** `GET /api/json?tree=jobs[...]` answers every job of the root (or one folder) in one request. */
const trigger: TriggerDefinition<{ folder?: string }> = {
  key: "new-job",
  title: "New Job",
  description: "The run gets each job newly created at the instance root or in a folder.",
  params: [{
    key: "folder",
    label: "Folder",
    type: "string",
    hint: "Folder path (`team/project`). Leave empty to watch root-level jobs.",
  }],
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Job URL" },
    { key: "values", type: "object", label: "Job" },
  ],
  sample: {
    change: "added",
    key: "https://ci.example.com/job/my-job/",
    values: { name: "my-job", url: "https://ci.example.com/job/my-job/", color: "blue" },
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const result = await listJobs.execute({ folder: params.folder }, ctx) as {
      jobs?: Array<{ url?: string }>;
    };
    return await pollSnapshot({
      state,
      rows: (result.jobs ?? []).flatMap((j) => j.url ? [{ key: j.url, values: j }] : []),
      emit: { added: true, updated: false },
      maxRows: 5000,
    });
  },
};

export default trigger;
