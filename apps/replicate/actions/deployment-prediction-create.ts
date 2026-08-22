import type { ActionDefinition } from "@w6w/types";
import { compact, csv, json, preferWait, ReplicateClient } from "../lib/client.ts";
import { WAIT_PARAM } from "../lib/params.ts";
import { decorate } from "./prediction-create.ts";

/**
 * `POST /deployments/{deployment_owner}/{deployment_name}/predictions` —
 * verified against Replicate's OpenAPI document
 * (`deployments.predictions.create`).
 *
 * **A deployment is a model with hardware kept warm for it.** Running through
 * one avoids the cold start a public model pays on its first request, which is
 * the difference between a two-second response and a two-minute one — and it
 * is also why a deployment costs money while it is idle. That trade is the
 * whole reason to choose this over `prediction-create-from-model`.
 *
 * The prediction itself behaves identically: asynchronous unless you ask it to
 * wait, and still possibly `starting` even then.
 */
const action: ActionDefinition = {
  key: "deployment-prediction-create",
  type: "perform",
  resource: "prediction",
  title: "Run a deployment",
  description: "Start a prediction on a deployment — a model with warm hardware behind it.",
  idempotent: false,
  params: [
    {
      key: "deployment",
      label: "Deployment",
      type: "string",
      required: true,
      default: "",
      placeholder: "acme/my-deployment",
      hint: "`owner/name` of the deployment.",
    },
    {
      key: "input",
      label: "Input",
      type: "json",
      required: true,
      default: "",
      hint: "The underlying model's input schema.",
    },
    WAIT_PARAM,
    { key: "webhook", label: "Webhook URL", type: "string", default: "" },
    { key: "webhookEventsFilter", label: "Webhook Events", type: "string", default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Prediction id" },
    { key: "status", type: "string", label: "starting, processing, succeeded, failed or canceled" },
    { key: "output", type: "object", label: "Output — null until the model has actually run" },
    { key: "metrics", type: "object", label: "`predict_time` — what this cost, in seconds" },
    { key: "finished", type: "boolean", label: "Whether it reached a terminal state" },
    { key: "succeeded", type: "boolean", label: "Whether it finished successfully" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const raw = String(p.deployment ?? "").trim();
    const [owner, name, ...rest] = raw.split("/");
    if (!owner || !name || rest.length > 0) {
      throw new Error(`\`deployment\` should be "owner/name", not "${raw}"`);
    }
    const modelInput = json(p.input, "input");
    if (modelInput === undefined || typeof modelInput !== "object" || Array.isArray(modelInput)) {
      throw new Error("`input` is required — a JSON object matching the model's input schema");
    }

    const wait = preferWait(p.waitSeconds);
    ctx.log("info", "running a Replicate deployment", {
      deployment: `${owner}/${name}`,
      waiting: Boolean(wait),
    });

    const result = await new ReplicateClient(ctx).request<{ status?: string }>(
      `/deployments/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/predictions`,
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
