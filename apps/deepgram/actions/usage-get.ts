import type { ActionDefinition } from "@w6w/types";
import { DeepgramClient, isoDate, query } from "../lib/client.ts";

/**
 * `GET /v1/projects/{id}/usage` — what has been spent, in hours and requests.
 *
 * The summary a cost review starts from: total requests, total audio hours, and
 * how they split across models and features. Deepgram bills by audio duration
 * rather than by request, so **hours are the number that matters** — ten
 * thousand voicemails can cost less than a hundred conference recordings.
 *
 * ## Dates are `YYYY-MM-DD`, and a timestamp is misread rather than rejected
 *
 * The usage endpoints take a plain date. A full ISO timestamp is not an error;
 * it produces a range that is not the one asked for. This action accepts either
 * and converts.
 *
 * ## Tags are how spend gets attributed
 *
 * `audio-transcribe` and the other actions here can attach a `tag`, and usage
 * can be filtered by it — which is the only way to answer "what did the support
 * summarisation workflow cost" as opposed to "what did Deepgram cost".
 */
const action: ActionDefinition = {
  key: "usage-get",
  type: "read",
  resource: "usage",
  title: "Get usage",
  description:
    "Requests and audio hours over a date range. Deepgram bills by duration, so hours are the " +
    "number that matters — not the request count.",
  params: [
    {
      key: "start",
      label: "From",
      type: "datetime",
      default: "",
      hint: "Deepgram wants `YYYY-MM-DD`; a timestamp is converted for you rather than misread.",
    },
    { key: "end", label: "To", type: "datetime", default: "" },
    {
      key: "tag",
      label: "Tag",
      type: "string",
      default: "",
      hint: "The label attached when the request was made — the only way to attribute spend to " +
        "one workflow.",
    },
    {
      key: "model",
      label: "Model UUID",
      type: "string",
      default: "",
      advanced: true,
    },
    {
      key: "endpoint",
      label: "Endpoint",
      type: "select",
      default: "",
      advanced: true,
      options: [
        { value: "", label: "All" },
        { value: "listen", label: "Transcription" },
        { value: "read", label: "Text analysis" },
        { value: "speak", label: "Speech generation" },
      ],
    },
  ],
  output: [
    { key: "resolution", type: "object", label: "The range Deepgram actually reported on" },
    { key: "results", type: "array", label: "Usage, per period" },
    { key: "totalHours", type: "number", label: "Audio hours — what you are billed on" },
    { key: "totalRequests", type: "number", label: "Requests made" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new DeepgramClient(ctx);

    const body = await client.request<{
      results?: Array<{ requests?: number; total_hours?: number; hours?: number }>;
    }>(`/v1/projects/${encodeURIComponent(client.projectId)}/usage`, {
      query: query({
        start: isoDate(p.start, "start"),
        end: isoDate(p.end, "end"),
        tag: p.tag,
        model: p.model,
        endpoint: p.endpoint,
      }),
    });

    const results = body?.results ?? [];
    const totalHours = results.reduce(
      (sum, r) => sum + Number(r?.total_hours ?? r?.hours ?? 0),
      0,
    );
    const totalRequests = results.reduce((sum, r) => sum + Number(r?.requests ?? 0), 0);

    return { ...body, results, totalHours, totalRequests };
  },
};

export default action;
