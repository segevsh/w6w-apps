import type { ActionDefinition } from "@w6w/types";
import { BreezyClient, company } from "../lib/client.ts";
import { companyIdParam } from "../lib/params.ts";

interface Input {
  companyId: string;
}

/** `GET /company/{id}/pipelines` — an object keyed by pipeline name, not an array. */
const pipelineList: ActionDefinition<Input> = {
  key: "pipeline-list",
  type: "search",
  resource: "pipeline",
  title: "List Pipelines",
  description:
    "List the company's hiring pipelines, keyed by pipeline name (default, default_pool, custom ones), each with its ordered stages.",
  params: [companyIdParam],
  output: [{ key: "pipelines", type: "object", label: "Pipelines keyed by name" }],

  async execute(input, ctx) {
    const body = await new BreezyClient(ctx).request<unknown>(
      "GET",
      `${company(input.companyId)}/pipelines`,
    );
    return { pipelines: body && typeof body === "object" && !Array.isArray(body) ? body : {} };
  },
};

export default pipelineList;
