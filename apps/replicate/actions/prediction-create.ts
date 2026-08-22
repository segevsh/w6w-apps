import type { ActionDefinition } from "@w6w/types";
import { compact, csv, json, preferWait, ReplicateClient } from "../lib/client.ts";
import { WAIT_PARAM } from "../lib/params.ts";

/**
 * `POST /predictions` — verified against Replicate's OpenAPI document
 * (`predictions.create`; required `version` and `input`).
 *
 * **A prediction is a background job.** Without the wait header this returns
 * `status: "starting"` and **no output at all** — the model has not run yet.
 * A workflow that reads `output` off this response gets `null` on almost every
 * model, which is the single most likely way to ship a broken Replicate
 * integration.
 *
 * There are three ways to get the result, and the app supports all three
 * honestly:
 *
 *   - **Wait** — `Wait For Output` sets Replicate's `Prefer: wait=n` header, up
 *     to 60 seconds. But if the model is slower it *still* returns `starting`,
 *     so the status must be checked either way.
 *   - **Poll** — `prediction-get` until `finished` is true.
 *   - **Webhook** — Replicate calls you when it is done, which is the right
 *     shape for anything that takes minutes.
 *
 * **`version` is the pinned version id, not the model name.** `owner/name`
 * alone is refused by this endpoint; `prediction-create-from-model` is the
 * action that takes a model and runs its current version.
 */
const action: ActionDefinition = {
  key: "prediction-create",
  type: "perform",
  resource: "prediction",
  title: "Run a model version",
  description: "Start a prediction on a pinned model version. Returns before the model has run.",
  // Two calls run the model twice, and each one is billed.
  idempotent: false,
  params: [
    {
      key: "version",
      label: "Version ID",
      type: "string",
      required: true,
      default: "",
      placeholder: "5c7d5dc6dd8bf75c1acaa8565735e7986bc5b66206b55cca93cb72c9bf15ccaa",
      hint: "The pinned VERSION id, not `owner/name` — see Run a Model for that.",
    },
    {
      key: "input",
      label: "Input",
      type: "json",
      required: true,
      default: "",
      placeholder: '{"prompt":"a photo of an astronaut riding a horse"}',
      hint: "The model's own input schema — every model differs. Get Model Version shows it.",
    },
    WAIT_PARAM,
    {
      key: "webhook",
      label: "Webhook URL",
      type: "string",
      default: "",
      hint: "HTTPS. The right shape for a model that takes minutes.",
    },
    {
      key: "webhookEventsFilter",
      label: "Webhook Events",
      type: "string",
      default: "",
      placeholder: "completed",
      hint: "Comma-separated: start, output, logs, completed. Blank sends all of them.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Prediction id" },
    {
      key: "status",
      type: "string",
      label: "starting, processing, succeeded, failed or canceled — check it",
    },
    { key: "output", type: "object", label: "Output — null until the model has actually run" },
    { key: "error", type: "string", label: "Why it failed" },
    { key: "metrics", type: "object", label: "`predict_time` — what this cost, in seconds" },
    { key: "urls", type: "object", label: "Where to poll, cancel or stream" },
    { key: "finished", type: "boolean", label: "Whether it reached a terminal state" },
    { key: "succeeded", type: "boolean", label: "Whether it finished successfully" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const version = String(p.version ?? "").trim();
    if (!version) throw new Error("`version` is required");
    if (version.includes("/") && !version.includes(":")) {
      throw new Error(
        `\`version\` looks like a model name ("${version}") — this endpoint takes a pinned ` +
          "version id. Use Run a Model to run a model's current version.",
      );
    }
    const modelInput = json(p.input, "input");
    if (modelInput === undefined || typeof modelInput !== "object" || Array.isArray(modelInput)) {
      throw new Error("`input` is required — a JSON object matching the model's input schema");
    }

    const wait = preferWait(p.waitSeconds);
    ctx.log("info", "creating a Replicate prediction", { version, waiting: Boolean(wait) });

    const result = await new ReplicateClient(ctx).request<{ status?: string }>("/predictions", {
      method: "POST",
      headers: wait ? { prefer: wait } : undefined,
      body: compact({
        version,
        input: modelInput,
        webhook: p.webhook,
        webhook_events_filter: csv(p.webhookEventsFilter),
      }),
    });
    return decorate(result);
  },
};

/** `status` alone forces every caller to know the vocabulary; these do not. */
export function decorate(result: { status?: string } | undefined): Record<string, unknown> {
  const status = String(result?.status ?? "");
  return {
    ...result,
    finished: ["succeeded", "failed", "canceled"].includes(status),
    succeeded: status === "succeeded",
  };
}

export default action;
