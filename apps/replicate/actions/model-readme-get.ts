import type { ActionDefinition } from "@w6w/types";
import { ReplicateClient, splitModel } from "../lib/client.ts";

/**
 * `GET /models/{model_owner}/{model_name}/readme` — verified against
 * Replicate's OpenAPI document (`models.readme.get`).
 *
 * Returns the readme as **Markdown text**, not JSON — the only endpoint in this
 * app that does. It is where a model's author explains what the inputs actually
 * mean, which the machine-readable schema cannot: a schema says `guidance` is a
 * number between 1 and 20, and the readme says what it does.
 */
const action: ActionDefinition = {
  key: "model-readme-get",
  type: "read",
  resource: "model",
  title: "Get a model's readme",
  description: "The author's documentation, as Markdown — what the input fields actually mean.",
  params: [
    { key: "model", label: "Model", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "readme", type: "string", label: "The readme, as Markdown" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { owner, name } = splitModel(p.model);

    ctx.log("info", "getting a Replicate model readme", { model: `${owner}/${name}` });

    // Markdown, not JSON — the client is told not to parse it.
    const readme = await new ReplicateClient(ctx).request<string>(
      `/models/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/readme`,
      { raw: true },
    );
    return { readme };
  },
};

export default action;
