import type { ActionDefinition } from "@w6w/types";
import { DATASETS_SERVER, HuggingFaceClient, query, repoId } from "../lib/client.ts";

/**
 * `GET datasets-server.huggingface.co/rows` — read rows without downloading
 * the dataset.
 *
 * ## The thing that makes datasets usable from a workflow
 *
 * A dataset on the Hub is often gigabytes of Parquet. This serves rows out of
 * it directly, so "look at a hundred examples" costs one HTTP request rather
 * than a download and a Python environment.
 *
 * ## `config` and `split` are both required and neither is guessable
 *
 * A dataset has one or more *configs* (subsets — `plain_text`, `en`, `2024`)
 * and each has *splits* (`train`, `validation`, `test`). The names are the
 * dataset author's and vary completely. `dataset-get` reports them; guessing
 * `train` works often enough to be misleading.
 *
 * ## Not every dataset is served
 *
 * The rows service works on datasets it has been able to convert to Parquet.
 * One with a custom loading script, or one that is too large, or one still
 * being processed, simply is not available — and the error says so rather than
 * pretending the dataset is empty.
 *
 * ## Renames show up here as a message rather than a redirect
 *
 * Verified live: asking for `squad` returns **404 with "The dataset has been
 * renamed"**, where the Hub itself would have redirected. Same cause, two
 * different failures, and this one at least says what happened.
 */
const action: ActionDefinition = {
  key: "dataset-rows",
  type: "read",
  resource: "dataset",
  title: "Read dataset rows",
  description:
    "Read rows straight out of a dataset without downloading it. `config` and `split` are the " +
    "author's own names — `dataset-get` reports them, and guessing `train` is often wrong.",
  params: [
    {
      key: "dataset",
      label: "Dataset",
      type: "string",
      required: true,
      default: "",
      placeholder: "rajpurkar/squad",
      hint: "`namespace/name`. A renamed dataset answers 404 here rather than redirecting.",
    },
    {
      key: "config",
      label: "Config",
      type: "string",
      required: true,
      default: "",
      hint: "The subset — `plain_text`, `en`, a year. Author-chosen and not guessable.",
    },
    {
      key: "split",
      label: "Split",
      type: "string",
      required: true,
      default: "train",
      hint: "`train`, `validation`, `test`, or whatever the author called them.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      default: 0,
    },
    {
      key: "length",
      label: "Rows",
      type: "number",
      default: 10,
      hint: "Up to 100 per request.",
    },
  ],
  output: [
    { key: "rows", type: "array", label: "The rows" },
    { key: "count", type: "number", label: "Returned" },
    { key: "totalRows", type: "number", label: "Rows in the split" },
    { key: "features", type: "array", label: "The columns and their types" },
    { key: "hasMore", type: "boolean", label: "Whether the offset can go further" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const dataset = repoId(p.dataset, "dataset");
    const config = String(p.config ?? "").trim();
    const split = String(p.split ?? "").trim();
    if (!config) throw new Error("`config` is required — `dataset-get` reports the available ones");
    if (!split) throw new Error("`split` is required");

    const offset = Math.max(0, Number(p.offset ?? 0));
    const length = Math.min(100, Math.max(1, Number(p.length ?? 10)));

    const result = await new HuggingFaceClient(ctx).request<{
      rows?: Array<{ row?: Record<string, unknown> }>;
      features?: unknown[];
      num_rows_total?: number;
    }>("/rows", {
      host: DATASETS_SERVER,
      query: query({ dataset, config, split, offset, length }),
    });

    // Each entry wraps the actual row, which is rarely what a caller wants.
    const wrapped = result?.rows ?? [];
    const rows = wrapped.map((entry) => entry?.row ?? entry);
    const totalRows = Number(result?.num_rows_total ?? NaN);

    ctx.log("info", "read Hugging Face dataset rows", { count: rows.length, offset });

    return {
      rows,
      count: rows.length,
      totalRows: Number.isFinite(totalRows) ? totalRows : undefined,
      features: result?.features ?? [],
      hasMore: Number.isFinite(totalRows)
        ? offset + rows.length < totalRows
        : rows.length === length,
    };
  },
};

export default action;
