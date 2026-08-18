import type { ActionDefinition } from "@w6w/types";
import { ChecklyClient } from "../lib/client.ts";

/**
 * `GET /v1/check-results/{checkId}/{checkResultId}` — verified against
 * Checkly's OpenAPI document (`getV1CheckresultsCheckidCheckresultid`).
 *
 * The full record of one run, including the response body or the browser
 * script's console output. This is what an incident workflow attaches to a
 * ticket.
 *
 * The screenshots, traces and videos a browser check produces are **not** in
 * here — they are files behind a separate assets endpoint, which this app does
 * not fetch because an App returns JSON, not bytes.
 */
const action: ActionDefinition = {
  key: "check-result-get",
  type: "read",
  resource: "check-result",
  title: "Get a check result",
  description: "The full record of one run, with its response or console output.",
  params: [
    { key: "checkId", label: "Check ID", type: "string", required: true, default: "" },
    { key: "checkResultId", label: "Result ID", type: "string", required: true, default: "" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const checkId = String(p.checkId ?? "").trim();
    if (!checkId) throw new Error("`checkId` is required");
    const resultId = String(p.checkResultId ?? "").trim();
    if (!resultId) throw new Error("`checkResultId` is required");

    ctx.log("info", "getting a Checkly check result", { checkId });

    return await new ChecklyClient(ctx).request(
      `/v1/check-results/${encodeURIComponent(checkId)}/${encodeURIComponent(resultId)}`,
    );
  },
};

export default action;
