import type { ActionDefinition } from "@w6w/types";
import { compact, OllamaClient, requiredString } from "../lib/client.ts";

/**
 * `POST /api/show` — everything Ollama knows about one installed model.
 *
 * Useful before calling it: `capabilities` says whether it can do `completion`,
 * `tools`, `vision`, `embedding` or `thinking`, and `modelInfo` carries the
 * architecture and the maximum context length. A model that is not installed
 * is a 404.
 */
const action: ActionDefinition = {
  key: "model-show",
  type: "read",
  resource: "model",
  title: "Show a model",
  description:
    "Details of an installed model: its Modelfile, parameters, prompt template, family, " +
    "quantization, capabilities (completion, tools, vision, embedding, thinking) and " +
    "architecture info such as the maximum context length.",
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "",
      placeholder: "llama3.2:3b",
    },
    {
      key: "verbose",
      label: "Verbose",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Include the full tokenizer vocabulary and tensor lists in `modelInfo`. Large.",
    },
  ],
  output: [
    {
      key: "capabilities",
      type: "array",
      label: "completion, tools, vision, embedding, thinking…",
    },
    { key: "details", type: "object", label: "Format, family, parameter size, quantization" },
    { key: "modelInfo", type: "object", label: "Architecture info, including context length" },
    { key: "parameters", type: "string", label: "The Modelfile PARAMETER lines" },
    { key: "template", type: "string", label: "The prompt template" },
    { key: "modelfile", type: "string", label: "The Modelfile" },
    { key: "license", type: "string", label: "The model's licence text" },
    { key: "contextLength", type: "number", label: "Maximum context, when the model reports it" },
    { key: "modifiedAt", type: "string", label: "When it was last modified" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const model = requiredString(p.model, "model");
    const r = await new OllamaClient(ctx).request<Record<string, unknown>>("/api/show", {
      method: "POST",
      body: compact({ model, verbose: p.verbose === true ? true : undefined }),
    });

    const info = (r?.model_info ?? {}) as Record<string, unknown>;
    const ctxKey = Object.keys(info).find((k) => k.endsWith(".context_length"));
    const contextLength = ctxKey && typeof info[ctxKey] === "number"
      ? info[ctxKey] as number
      : undefined;
    return {
      capabilities: r?.capabilities,
      details: r?.details,
      modelInfo: r?.model_info,
      parameters: r?.parameters,
      template: r?.template,
      modelfile: r?.modelfile,
      license: r?.license,
      contextLength,
      modifiedAt: r?.modified_at,
    };
  },
};

export default action;
