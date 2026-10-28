import type { ActionDefinition } from "@w6w/types";
import { BigQueryClient, resolveProject } from "../lib/client.ts";
import { LIST_PARAMS, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /projects/{projectId}/datasets` — verified against BigQuery's discovery
 * document (`datasets.list`).
 */
const action: ActionDefinition = {
  key: "dataset-list",
  type: "read",
  resource: "dataset",
  title: "List datasets",
  description: "List the datasets in a project.",
  params: [
    PROJECT_PARAM,
    ...LIST_PARAMS,
    {
      key: "all",
      label: "Include Hidden",
      type: "boolean",
      default: false,
      hint: "Include hidden datasets, such as the anonymous ones query caching creates.",
    },
    {
      key: "filter",
      label: "Label Filter",
      type: "string",
      default: "",
      placeholder: "labels.team:analytics",
      hint: "BigQuery's label filter syntax.",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectId);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing BigQuery datasets", { project, returnAll, limit });

    return await new BigQueryClient(ctx).requestAll(
      `/projects/${encodeURIComponent(project)}/datasets`,
      "datasets",
      {
        query: {
          all: p.all === true ? "true" : undefined,
          filter: (p.filter as string) || undefined,
        },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
