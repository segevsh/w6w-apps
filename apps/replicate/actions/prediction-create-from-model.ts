import type { ActionDefinition } from "@w6w/types";
import { compact, csv, json, preferWait, ReplicateClient, splitModel } from "../lib/client.ts";
import { WAIT_PARAM } from "../lib/params.ts";
import { decorate } from "./prediction-create.ts";

/**
 * `POST /models/{model_owner}/{model_name}/predictions` — verified against
 * Replicate's OpenAPI document (`models.predictions.create`).
 *
 * Runs a model's **current** version rather than a pinned one, which is the
 * difference from `prediction-create` and the trade worth understanding: this
 * always gets the latest, and "the latest" can change underneath a workflow
 * without anything in the workflow changing. For a reproducible pipeline, pin
 * the version; for "use whatever is current", use this.
 *
 * Replicate's **official models** are only runnable this way — they do not
 * expose version ids at all.
 *
 * Everything else about it is `prediction-create`: it returns before the model
 * has run unless you ask it to wait, and even then it may not.
 */
const action: ActionDefinition = {
  key: "prediction-create-from-model",
  type: "perform",
  resource: "prediction",
  title: "Run a model",
  description: "Start a prediction on a model's current version. Returns before the model has run.",
  idempotent: false,
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "",
      placeholder: "black-forest-labs/flux-schnell",
      hint: "`owner/name`. Runs whatever version is current — which can change under you.",
    },
    {
      key: "input",
      label: "Input",
      type: "json",
      required: true,
      default: "",
      placeholder: '{"prompt":"a photo of an astronaut riding a horse"}',
      hint: "The model's own input schema — Get Model shows it.",
    },
    WAIT_PARAM,
    { key: "webhook", label: "Webhook URL", type: "string", default: "" },
    {
      key: "webhookEventsFilter",
      label: "Webhook Events",
      type: "string",
      default: "",
      hint: "Comma-separated: start, output, logs, completed.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Prediction id" },
    { key: "status", type: "string", label: "starting, processing, succeeded, failed or canceled" },
    { key: "output", type: "object", label: "Output — null until the model has actually run" },
    { key: "error", type: "string", label: "Why it failed" },
    { key: "metrics", type: "object", label: "`predict_time` — what this cost, in seconds" },
    { key: "finished", type: "boolean", label: "Whether it reached a terminal state" },
    { key: "succeeded", type: "boolean", label: "Whether it finished successfully" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { owner, name } = splitModel(p.model);
    const modelInput = json(p.input, "input");
    if (modelInput === undefined || typeof modelInput !== "object" || Array.isArray(modelInput)) {
      throw new Error("`input` is required — a JSON object matching the model's input schema");
    }

    const wait = preferWait(p.waitSeconds);
    ctx.log("info", "running a Replicate model", {
      model: `${owner}/${name}`,
      waiting: Boolean(wait),
    });

    const result = await new ReplicateClient(ctx).request<{ status?: string }>(
      `/models/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/predictions`,
      {
        method: "POST",
        headers: wait ? { prefer: wait } : undefined,
        body: compact({
          input: modelInput,
          webhook: p.webhook,
          webhook_events_filter: csv(p.webhookEventsFilter),
        }),
      },
    );
    return decorate(result);
  },
};

export default action;
