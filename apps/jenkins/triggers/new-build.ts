import { pollFromListAction } from "../../_shared/poll/mod.ts";
import getJobInfo from "../actions/get-job-info.ts";

/**
 * `GET /job/<name>/api/json` carries the job's `builds` (number + url, the most recent ones). The
 * order is not relied on: the items are sorted by build number, highest first, before the kit sees them.
 */
export default pollFromListAction<{ job: string }>({
  key: "new-build",
  title: "New Build",
  description: "The run gets each new build of a Jenkins job.",
  action: getJobInfo as never,
  params: [{
    key: "job",
    label: "Job",
    type: "string",
    required: true,
    placeholder: "my-job",
    hint: "Job name, or `folder/job` for a job nested in a folder.",
  }],
  input: (params) => ({ job: params.job }),
  items: (result) => {
    const builds = (result as { builds?: Array<{ number?: number }> } | null)?.builds ?? [];
    return builds
      .filter((b) => typeof b.number === "number")
      .sort((a, b) => (b.number as number) - (a.number as number));
  },
  idOf: (item) => String((item as { number?: unknown }).number ?? ""),
  output: [
    { key: "number", type: "number", label: "Build number" },
    { key: "url", type: "string", label: "Build URL" },
  ],
  sample: {
    _class: "hudson.model.FreeStyleBuild",
    number: 42,
    url: "https://ci.example.com/job/my-job/42/",
  },
  maxPages: 1,
});
