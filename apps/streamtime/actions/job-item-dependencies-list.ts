import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /jobs/{job_id}/job_items/dependencies` — the scheduling graph between a
 * job's items.
 *
 * Each row is `parentJobItemId` → `childJobItemId` with a `dependencyType`
 * (`{ id, name }`), a `lagDays` offset, and `isFloat`. It is read-only in the
 * document: there is no create or delete route for a dependency, so items are
 * linked inside the Streamtime app, not through the API.
 */
interface Input {
  jobId: number;
}

const jobItemDependenciesList: ActionDefinition<Input> = {
  key: "job-item-dependencies-list",
  type: "search",
  resource: "job-item",
  title: "List Job Item Dependencies",
  description:
    "List the dependencies between a job's items. Read-only — the API cannot create one.",
  params: [idParam("jobId", "Job ID")],
  output: [{ key: "dependencies", type: "array", label: "Job item dependencies" }],

  async execute(input, ctx) {
    const dependencies = await new StreamtimeClient(ctx).request<unknown[]>(
      `/jobs/${encodeId(input.jobId)}/job_items/dependencies`,
    );
    return { dependencies: dependencies ?? [] };
  },
};

export default jobItemDependenciesList;
