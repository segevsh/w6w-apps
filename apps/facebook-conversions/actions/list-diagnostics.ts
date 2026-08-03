import type { ActionDefinition } from "@w6w/types";
import { ConversionsClient, datasetFromConnection, type GraphListResponse } from "../lib/client.ts";

interface Input {
  datasetId?: string;
  connectionMethod?: "ALL" | "APP" | "BROWSER" | "SERVER";
  checks?: string;
}

interface DACheck {
  key?: string;
  title?: string;
  description?: string;
  action_uri?: string;
  [field: string]: unknown;
}

/**
 * Integration diagnostics for the dataset — `GET /{ads-pixel-id}/da_checks`.
 *
 * `connection_method` is what makes this a Conversions API surface rather than
 * a generic pixel one: filtered to `SERVER` it reports on server events
 * specifically. `pixel_missing_param_in_events` is the check that matters here
 * — it is Meta's own answer to "my events are landing but not matching", and
 * therefore the natural companion to `get-dataset-quality`.
 *
 * Defaults to `SERVER` for that reason; pass `ALL` to see the browser Pixel's
 * diagnostics alongside. Requires `ads_read`.
 */
const listDiagnostics: ActionDefinition<Input, GraphListResponse<DACheck>> = {
  key: "list-diagnostics",
  type: "read",
  resource: "dataset",
  title: "List Dataset Diagnostics",
  description:
    "Run Meta's dataset diagnostic checks — missing event parameters, delivery decline — scoped to server events by default.",
  params: [
    {
      key: "datasetId",
      label: "Dataset (Pixel) ID",
      type: "string",
      hint: "Defaults to the dataset stored on the connection.",
    },
    {
      key: "connectionMethod",
      label: "Connection Method",
      type: "select",
      default: "SERVER",
      options: [
        { value: "SERVER", label: "Server (Conversions API)" },
        { value: "BROWSER", label: "Browser (Pixel)" },
        { value: "APP", label: "App" },
        { value: "ALL", label: "All" },
      ],
    },
    {
      key: "checks",
      label: "Checks",
      type: "string",
      advanced: true,
      hint:
        "Comma-separated subset of pixel_missing_param_in_events, pixel_decline. All checks run when empty.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Diagnostic checks" },
    { key: "paging", type: "object", label: "Paging" },
  ],

  execute(input, ctx) {
    const datasetId = datasetFromConnection(ctx.connection, input.datasetId);
    const client = new ConversionsClient(ctx);
    return client.request<GraphListResponse<DACheck>>(`/${datasetId}/da_checks`, {
      params: {
        connection_method: input.connectionMethod ?? "SERVER",
        checks: input.checks
          ? JSON.stringify(input.checks.split(",").map((s) => s.trim()).filter(Boolean))
          : undefined,
      },
    });
  },
};

export default listDiagnostics;
