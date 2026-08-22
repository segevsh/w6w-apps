import type { ActionDefinition } from "@w6w/types";
import { JumpCloudClient, spaced } from "../lib/client.ts";
import { FILTER_PARAMS, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/commandresults` (V1) — verified against JumpCloud's V1 OpenAPI
 * document (`command_results_list`).
 *
 * **This is where a command's outcome actually lives.** `command-run` returns
 * queue ids and nothing else; the exit code and output show up here once the
 * device has run the script and reported back — immediately for an online
 * machine, whenever it next connects for an offline one.
 *
 * A result's `exitCode` is the script's, so `0` with empty `response.output` is
 * a successful silent script, not a missing result. **The absence of a result
 * is not failure** — it means the device has not reported yet.
 */
const action: ActionDefinition = {
  key: "command-result-list",
  type: "read",
  resource: "command-result",
  title: "List command results",
  description: "List the outcomes devices reported for commands, with exit codes and output.",
  params: [
    {
      key: "filter",
      label: "Filter",
      type: "string",
      default: "",
      placeholder: "workflowId:$eq:5f0…",
      hint: "JumpCloud's filter grammar. Narrow to one command with `workflowId`.",
    },
    ...FILTER_PARAMS.filter((param) => param.key !== "filter"),
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing JumpCloud command results", { returnAll, limit });

    return await new JumpCloudClient(ctx).requestAll("/commandresults", {
      query: {
        filter: (p.filter as string) || undefined,
        sort: spaced(p.sort),
        fields: spaced(p.fields),
      },
    }, returnAll ? Infinity : limit);
  },
};

export default action;
