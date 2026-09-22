import type { ActionDefinition } from "@w6w/types";
import { NocrmClient, type NocrmPage, V2 } from "../lib/client.ts";
import { listOutput } from "../lib/params.ts";

/** No input: the List-the-pipelines section documents no parameters. */
type Input = Record<string, never>;

/**
 * `GET /api/v2/pipelines` — list the account's pipelines.
 *
 * The List-the-pipelines section of noCRM's API document
 * (<https://www.nocrm.io/api>, read 2026-09-22) documents no parameters, and
 * its sample response carries `id`, `name`, `is_default` and the timestamps —
 * which is why `pipeline-get-many` exists as a separate action from
 * `step-get-many`: a step's `pipeline_id` is meaningless without this list.
 */
const pipelineGetMany: ActionDefinition<Input, NocrmPage> = {
  key: "pipeline-get-many",
  type: "search",
  resource: "pipeline",
  title: "List Pipelines",
  description: "List the account's sales pipelines (GET /api/v2/pipelines).",
  params: [],
  output: listOutput("Pipelines"),

  execute(_input, ctx) {
    return new NocrmClient(ctx).list(`${V2}/pipelines`);
  },
};

export default pipelineGetMany;
