import type { ActionDefinition } from "@w6w/types";
import { compact, json, ReplicateClient, splitModel } from "../lib/client.ts";

/**
 * `POST /models/{model_owner}/{model_name}/versions/{version_id}/trainings` —
 * verified against Replicate's OpenAPI document (`trainings.create`).
 *
 * **A training is a prediction that produces a model.** It runs asynchronously
 * exactly like one — returns `starting`, and the result arrives later — but it
 * runs for **minutes to hours** rather than seconds, so the wait header does
 * not apply and a webhook is the only sensible way to hear about it.
 *
 * **`destination` is a model that must already exist.** Replicate writes the
 * trained weights into it as a new version, so a workflow has to create the
 * destination model first; naming one that does not exist fails.
 *
 * It is also the most expensive call in this app by a wide margin — a training
 * bills for its whole runtime on the hardware it was given.
 */
const action: ActionDefinition = {
  key: "training-create",
  type: "perform",
  resource: "training",
  title: "Start a training",
  description: "Fine-tune a model into a destination you already own. Runs for minutes to hours.",
  // Two calls run two trainings, and each bills for its whole runtime.
  idempotent: false,
  params: [
    {
      key: "model",
      label: "Base Model",
      type: "string",
      required: true,
      default: "",
      placeholder: "ostris/flux-dev-lora-trainer",
      hint: "`owner/name` of the trainer.",
    },
    {
      key: "versionId",
      label: "Version ID",
      type: "string",
      required: true,
      default: "",
      hint: "The trainer version to run.",
    },
    {
      key: "destination",
      label: "Destination Model",
      type: "string",
      required: true,
      default: "",
      placeholder: "your-name/your-model",
      hint: "`owner/name` of a model you own — it must EXIST already. The weights land there " +
        "as a new version.",
    },
    {
      key: "input",
      label: "Input",
      type: "json",
      required: true,
      default: "",
      hint: "The trainer's own input schema — Get Model Version shows it.",
    },
    {
      key: "webhook",
      label: "Webhook URL",
      type: "string",
      default: "",
      hint: "Strongly recommended: a training runs far too long to poll comfortably.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Training id" },
    { key: "status", type: "string", label: "starting — it will be running for a long time" },
    { key: "urls", type: "object", label: "Where to poll or cancel" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { owner, name } = splitModel(p.model);
    const versionId = String(p.versionId ?? "").trim();
    if (!versionId) throw new Error("`versionId` is required");

    const destination = String(p.destination ?? "").trim();
    // Validate the shape here — Replicate's own error for a malformed one is
    // about the field rather than about the slash.
    splitModel(destination);

    const trainingInput = json(p.input, "input");
    if (trainingInput === undefined || typeof trainingInput !== "object") {
      throw new Error("`input` is required — a JSON object matching the trainer's input schema");
    }

    // Worth a warn: this is the most expensive call the app can make.
    ctx.log("warn", "starting a Replicate training", {
      trainer: `${owner}/${name}`,
      destination,
    });

    return await new ReplicateClient(ctx).request(
      `/models/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/versions/${
        encodeURIComponent(versionId)
      }/trainings`,
      {
        method: "POST",
        body: compact({ destination, input: trainingInput, webhook: p.webhook }),
      },
    );
  },
};

export default action;
