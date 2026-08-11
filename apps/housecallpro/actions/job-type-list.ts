import type { ActionDefinition } from "@w6w/types";
import { HousecallClient, type NormalizedList } from "../lib/client.ts";
import { companyIdParam, listOutput } from "../lib/params.ts";

/**
 * `GET /job_fields/job_types` — the job types Create Job's `job_type_id` takes.
 *
 * The response carries the core pagination envelope, but the endpoint declares
 * **no `page` or `page_size` parameter** — `name` is the only documented filter.
 * So the page fields come back describing a page this action cannot move. That
 * is the reference's shape and no invented pagination is sent.
 */
interface Input {
  name?: string;
  companyId?: string;
}

const jobTypeList: ActionDefinition<Input, NormalizedList> = {
  key: "job-type-list",
  type: "read",
  resource: "job",
  title: "Get Job Types",
  description:
    "List the company's job types. Filter by name — the endpoint documents no pagination " +
    "parameters, only a name filter.",
  params: [
    { key: "name", label: "Name", type: "string", hint: "Filters job types by name." },
    companyIdParam,
  ],
  output: listOutput("Job types"),

  execute(input, ctx) {
    return new HousecallClient(ctx).list("/job_fields/job_types", "job_types", {
      companyId: input.companyId,
      query: { name: input.name },
    });
  },
};

export default jobTypeList;
