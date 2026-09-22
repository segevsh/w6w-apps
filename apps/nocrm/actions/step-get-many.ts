import type { ActionDefinition } from "@w6w/types";
import { NocrmClient, type NocrmPage, V2 } from "../lib/client.ts";
import { directionParam, listOutput } from "../lib/params.ts";

interface Input {
  direction?: string;
}

/**
 * `GET /api/v2/steps` — list the account's pipeline steps.
 *
 * The List-the-steps table in noCRM's API document
 * (<https://www.nocrm.io/api>, read 2026-09-22) documents exactly one optional
 * parameter, `direction`, default `asc`, described as ordering "by their
 * position". Each step in the sample response carries its `pipeline_id` and a
 * nested `pipeline` object, which is how a caller disambiguates two steps that
 * share a name — the ambiguity `lead-create`'s `step` parameter warns about.
 */
const stepGetMany: ActionDefinition<Input, NocrmPage> = {
  key: "step-get-many",
  type: "search",
  resource: "step",
  title: "List Steps",
  description:
    "List the account's pipeline steps with the pipeline each belongs to (GET /api/v2/steps).",
  params: [directionParam("asc")],
  output: listOutput("Steps"),

  execute(input, ctx) {
    return new NocrmClient(ctx).list(`${V2}/steps`, {
      query: { direction: input.direction },
    });
  },
};

export default stepGetMany;
