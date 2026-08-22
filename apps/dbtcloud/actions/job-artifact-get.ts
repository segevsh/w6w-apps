import type { ActionDefinition } from "@w6w/types";
import { DbtCloudClient, json } from "../lib/client.ts";

/**
 * `GET /api/v2/accounts/{account}/jobs/{job}/artifacts/{path}` — the artifact
 * from this job's **last successful** run.
 *
 * The difference from `run-artifact-get` is which question is being asked. A
 * run artifact answers "what did *that* build do"; a job artifact answers
 * "what does the project look like *now*", without first having to find the
 * newest passing run id.
 *
 * That makes it the right call for the standing use of `manifest.json`:
 * catalogues, lineage tools and freshness dashboards that want the current
 * shape of the project rather than the record of one build.
 *
 * The catch is the same as everywhere else here — this reads the last
 * **successful** run, so on a job that has been failing for a week it returns a
 * week-old manifest, cheerfully and with no indication that it has.
 * `job-get` with `most_recent_run` is how to tell.
 */
const action: ActionDefinition = {
  key: "job-artifact-get",
  type: "read",
  resource: "artifact",
  title: "Download a job's latest artifact",
  description:
    "An artifact from a job's last SUCCESSFUL run — the current shape of the project. On a job " +
    "that has been failing, that is an old artifact returned without complaint.",
  params: [
    { key: "jobId", label: "Job ID", type: "string", required: true, default: "" },
    {
      key: "path",
      label: "Artifact",
      type: "string",
      required: true,
      default: "manifest.json",
      hint: "`manifest.json` is the usual one here — the project's models, sources, tests and " +
        "dependency graph.",
    },
    {
      key: "step",
      label: "Step",
      type: "number",
      default: 0,
      advanced: true,
      hint: "1-based. Blank or 0 means the last step.",
    },
    {
      key: "mode",
      label: "Return",
      type: "select",
      default: "parsed",
      options: [
        { value: "parsed", label: "Parsed JSON" },
        { value: "raw", label: "Raw text — manifest.json can be very large" },
      ],
    },
  ],
  output: [
    { key: "artifact", type: "object", label: "The parsed artifact" },
    { key: "raw", type: "string", label: "The raw text, in raw mode" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const jobId = String(p.jobId ?? "").trim();
    if (!jobId) throw new Error("`jobId` is required");
    const path = String(p.path ?? "manifest.json").trim().replace(/^\/+/, "");
    if (!path) throw new Error("`path` is required");
    const step = Number(p.step ?? 0);

    const client = new DbtCloudClient(ctx);
    const text = await client.request<string>(
      `/api/v2/accounts/${client.accountId}/jobs/${encodeURIComponent(jobId)}/artifacts/${
        path.split("/").map(encodeURIComponent).join("/")
      }`,
      { query: { step: step > 0 ? step : undefined }, raw: true },
    );

    ctx.log("info", "downloaded a dbt Cloud job artifact", { jobId, path, bytes: text.length });
    if (String(p.mode ?? "parsed") === "raw") return { raw: text };
    return { artifact: json(text, path) };
  },
};

export default action;
