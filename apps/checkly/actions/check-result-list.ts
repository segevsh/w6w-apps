import type { ActionDefinition } from "@w6w/types";
import { ChecklyClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/check-results/{checkId}` — verified against Checkly's OpenAPI
 * document (`getV1CheckresultsCheckid`).
 *
 * The history of one check. **`hasFailures` is the filter that makes this
 * useful**: without it a busy check returns thousands of successful runs and
 * the interesting ones are buried.
 *
 * `resultType` is worth knowing about — Checkly distinguishes a `FINAL` result
 * from the `ATTEMPT` runs that preceded it under a retry strategy. Counting
 * every row as an incident overcounts by however many retries are configured.
 */
const action: ActionDefinition = {
  key: "check-result-list",
  type: "read",
  resource: "check-result",
  title: "List a check's results",
  description: "The run history of one monitor, optionally only the failures.",
  params: [
    { key: "checkId", label: "Check ID", type: "string", required: true, default: "" },
    {
      key: "hasFailures",
      label: "Failures Only",
      type: "boolean",
      default: false,
      hint: "Without this a busy check buries its failures in successful runs.",
    },
    {
      key: "resultType",
      label: "Result Type",
      type: "select",
      default: "",
      options: [
        { value: "", label: "All — includes retry attempts" },
        { value: "FINAL", label: "Final only — one row per run, after retries" },
        { value: "ATTEMPT", label: "Attempts only" },
      ],
      hint: "Counting every row as an incident overcounts by the number of retries.",
    },
    {
      key: "location",
      label: "Location",
      type: "string",
      default: "",
      hint: "Narrow to one region, e.g. `eu-west-1`.",
    },
    { key: "from", label: "From", type: "string", default: "", hint: "Unix timestamp." },
    { key: "to", label: "To", type: "string", default: "", hint: "Unix timestamp." },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.checkId ?? "").trim();
    if (!id) throw new Error("`checkId` is required");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Checkly check results", { id, returnAll, limit });

    return await new ChecklyClient(ctx).requestAll(
      `/v1/check-results/${encodeURIComponent(id)}`,
      {
        query: {
          hasFailures: p.hasFailures === true ? "true" : undefined,
          resultType: (p.resultType as string) || undefined,
          location: (p.location as string) || undefined,
          from: (p.from as string) || undefined,
          to: (p.to as string) || undefined,
        },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
