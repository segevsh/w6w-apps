import type { ActionDefinition } from "@w6w/types";
import { XaiClient } from "../lib/client.ts";

interface Input {
  model: string;
  text: string;
}

/** POST /v1/tokenize-text — the token ids a model would see for a text. */
const tokenizeText: ActionDefinition<Input> = {
  key: "tokenize-text",
  type: "perform",
  resource: "token",
  title: "Tokenize Text",
  description: "Tokenize text with a model to size a prompt (POST /v1/tokenize-text).",
  idempotent: true,
  params: [
    { key: "model", label: "Model", type: "string", required: true },
    { key: "text", label: "Text", type: "text", required: true },
  ],
  output: [{ key: "token_ids", type: "array", label: "Tokens" }],

  execute(input, ctx) {
    return new XaiClient(ctx).request("/v1/tokenize-text", {
      method: "POST",
      body: { model: input.model, text: input.text },
    });
  },
};

export default tokenizeText;
