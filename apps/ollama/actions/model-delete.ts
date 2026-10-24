import type { ActionDefinition } from "@w6w/types";
import { OllamaClient, requiredString } from "../lib/client.ts";

/**
 * `DELETE /api/delete` — remove a model and, if no other model shares them, its
 * layers from disk.
 *
 * Deleting is permanent: getting it back means `model-pull` again. A model that
 * is not installed is a 404 rather than a quiet success, so a typo in the name
 * does not look like it worked.
 */
const action: ActionDefinition = {
  key: "model-delete",
  type: "perform",
  resource: "model",
  title: "Delete a model",
  description:
    "Permanently remove a model from your Ollama server's disk. Getting it back means pulling " +
    "it again. A model that is not installed is an error, not a silent success.",
  idempotent: true,
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "",
      placeholder: "llama3.2:3b",
      hint: "The exact `name:tag` as `model-list` shows it.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "True when the server accepted the delete" },
    { key: "model", type: "string", label: "The model that was deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const model = requiredString(p.model, "model");
    await new OllamaClient(ctx).request("/api/delete", { method: "DELETE", body: { model } });
    return { deleted: true, model };
  },
};

export default action;
