import type { ActionDefinition } from "@w6w/types";
import { AmplitudeClient, query } from "../lib/client.ts";

/**
 * `POST /api/2/annotations` — mark a date on every chart.
 *
 * The counterpart to a deployment marker in an APM tool, and the most useful
 * thing a release pipeline can write into Amplitude: the next person asking why
 * conversion moved sees the release on the chart rather than having to correlate
 * it from somewhere else.
 *
 * ## The date is a day, not a moment
 *
 * `YYYY-MM-DD`, and Amplitude draws the line at the day boundary in the
 * project's own timezone. Two releases on the same day produce two annotations
 * on the same line, and there is no time-of-day precision to separate them —
 * so the label is where any finer detail has to go.
 *
 * ## There is no uniqueness
 *
 * Posting twice makes two annotations. A pipeline that retries on failure and
 * succeeds the second time leaves two identical lines on every chart in the
 * project, permanently, and removing them is a manual job in the UI.
 */
const action: ActionDefinition = {
  key: "annotation-create",
  type: "perform",
  resource: "annotation",
  title: "Add an annotation",
  description:
    "Mark a date on every chart — the release marker. There is NO uniqueness: posting twice " +
    "leaves two identical lines, and removing them is a manual job.",
  idempotent: false,
  params: [
    {
      key: "date",
      label: "Date",
      type: "string",
      required: true,
      default: "",
      placeholder: "2026-08-18",
      hint: "`YYYY-MM-DD`. A day, not a moment — Amplitude has no time-of-day precision here, so " +
        "put anything finer in the label.",
    },
    {
      key: "label",
      label: "Label",
      type: "string",
      required: true,
      default: "",
      placeholder: "Release 1.4.2",
      hint: "What appears on the chart. Include the time or build number if two land on one day.",
    },
    {
      key: "chartId",
      label: "Chart",
      type: "string",
      default: "",
      advanced: true,
      hint: "Scopes the annotation to one chart instead of the whole project.",
    },
  ],
  output: [
    { key: "created", type: "boolean", label: "Added" },
    { key: "id", type: "number", label: "Amplitude's id for it" },
    { key: "date", type: "string", label: "The date marked" },
    { key: "label", type: "string", label: "What it says" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const date = String(p.date ?? "").trim();
    const label = String(p.label ?? "").trim();
    if (!date) throw new Error("`date` is required");
    if (!label) throw new Error("`label` is required");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(
        `\`date\` must be YYYY-MM-DD — got ${JSON.stringify(date)}. Note this is the one place ` +
          "Amplitude wants dashes; the query endpoints want YYYYMMDD without them",
      );
    }

    const result = await new AmplitudeClient(ctx).dashboard<{
      annotation?: { id?: number; date?: string; label?: string };
    }>("/api/2/annotations", {
      method: "POST",
      query: query({ date, label, app_id: p.chartId }),
    });

    ctx.log("info", "added an Amplitude annotation", { date });
    return {
      created: true,
      id: result?.annotation?.id,
      date: result?.annotation?.date ?? date,
      label: result?.annotation?.label ?? label,
    };
  },
};

export default action;
