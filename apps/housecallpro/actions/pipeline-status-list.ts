import type { ActionDefinition } from "@w6w/types";
import { HousecallClient, type NormalizedList } from "../lib/client.ts";
import {
  companyIdParam,
  listOutput,
  paginationParams,
  pipelineResourceOptions,
} from "../lib/params.ts";

/**
 * `GET /pipeline/statuses` — the pipeline stages configured for one resource
 * type.
 *
 * `resource_type` is the only required query parameter anywhere in this app's
 * surface. The reference also states the empty case explicitly: an organization
 * without pipeline enabled gets an **empty array, not an error**, so a zero-row
 * result here is "the feature is off", not "the call failed".
 */
interface Input {
  resourceType: string;
  page?: number;
  pageSize?: number;
  companyId?: string;
}

const pipelineStatusList: ActionDefinition<Input, NormalizedList> = {
  key: "pipeline-status-list",
  type: "read",
  resource: "company",
  title: "Get Pipeline Statuses",
  description:
    "List the pipeline stages for leads, jobs or estimates. Returns an empty list — not an " +
    "error — for an organization without pipeline enabled.",
  params: [
    {
      key: "resourceType",
      label: "Resource type",
      type: "select",
      required: true,
      options: pipelineResourceOptions,
    },
    ...paginationParams(50),
    companyIdParam,
  ],
  output: listOutput("Pipeline statuses"),

  execute(input, ctx) {
    return new HousecallClient(ctx).list("/pipeline/statuses", "statuses", {
      companyId: input.companyId,
      query: {
        resource_type: input.resourceType,
        page: input.page,
        page_size: input.pageSize,
      },
    });
  },
};

export default pipelineStatusList;
