import type { ActionDefinition } from "@w6w/types";
import { SanityClient } from "../lib/client.ts";

/**
 * `GET /projects/{projectId}/datasets` — the datasets in this project.
 *
 * A dataset is a complete, independent copy of the content: `production` and
 * `development` share a project, a schema and a Studio, and share **no
 * documents at all**. That is why every action here takes a dataset and why
 * pointing a workflow at the wrong one produces an eerily empty result rather
 * than an error.
 *
 * `aclMode` marks whether a dataset is public — a public dataset is readable
 * with no token whatsoever, which is worth knowing before putting anything in
 * one.
 */
const action: ActionDefinition = {
  key: "dataset-list",
  type: "read",
  resource: "project",
  title: "List datasets",
  description:
    "The datasets in this project. They share a schema and share no documents — pointing at " +
    "the wrong one returns nothing rather than failing.",
  params: [],
  output: [
    { key: "datasets", type: "array", label: "Datasets" },
  ],

  async execute(_input, ctx) {
    const client = new SanityClient(ctx);
    const datasets = await client.request<unknown[]>(
      `/projects/${encodeURIComponent(client.projectId)}/datasets`,
      { management: true },
    );
    return { datasets };
  },
};

export default action;
