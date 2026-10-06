import type { ActionDefinition } from "@w6w/types";
import { XaiClient } from "../lib/client.ts";

/** GET /v1/language-models — chat/image-understanding models with modalities and aliases. */
const listLanguageModels: ActionDefinition<Record<string, never>> = {
  key: "list-language-models",
  type: "read",
  resource: "model",
  title: "List Language Models",
  description:
    "List chat and image-understanding models with modalities and aliases (GET /v1/language-models).",
  params: [],
  output: [{ key: "models", type: "array", label: "Language models" }],

  execute(_input, ctx) {
    return new XaiClient(ctx).request("/v1/language-models");
  },
};

export default listLanguageModels;
