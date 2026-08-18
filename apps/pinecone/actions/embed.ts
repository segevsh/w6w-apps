import type { ActionDefinition } from "@w6w/types";
import { compact, json, PineconeClient } from "../lib/client.ts";

/**
 * `POST /embed` on the control plane — verified against Pinecone's own
 * `inference` OpenAPI document (`embed`).
 *
 * Pinecone's hosted embedding models, callable on their own. The reason to use
 * them rather than a separate provider is consistency: the same models back
 * integrated-embedding indexes, so a workflow that needs a query vector for
 * `record-query` can produce one that lives in exactly the index's space.
 *
 * ## `input_type` is not a detail
 *
 * Most embedding models here are asymmetric: they embed a **passage** (a
 * document being stored) differently from a **query** (a question being asked),
 * and the parameter that says which is `parameters.input_type`. Embedding a
 * query as a passage returns a perfectly valid vector that retrieves subtly
 * worse results forever, with nothing to show that anything went wrong. It is
 * exposed as its own field for that reason rather than being buried in the
 * parameters blob.
 *
 * `truncate` decides what happens to input longer than the model's window —
 * `END` (the usual default) silently cuts it, `NONE` errors instead. For an
 * ingest pipeline, erroring is often what you want to know about.
 */
const action: ActionDefinition = {
  key: "embed",
  type: "perform",
  resource: "inference",
  title: "Generate embeddings",
  description: "Embed text with one of Pinecone's hosted models — the same models that back " +
    "integrated-embedding indexes. Say whether the text is a passage or a query; it matters.",
  idempotent: true,
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "multilingual-e5-large",
      hint: "`model-list` shows what is available: llama-text-embed-v2, multilingual-e5-large, " +
        "pinecone-sparse-english-v0 and others.",
    },
    {
      key: "inputs",
      label: "Texts",
      type: "json",
      required: true,
      default: "",
      hint: 'Array of strings, or Pinecone\'s own `[{"text":"…"}]` shape.',
    },
    {
      key: "inputType",
      label: "Input Type",
      type: "select",
      default: "passage",
      options: [
        { value: "passage", label: "Passage — text being stored" },
        { value: "query", label: "Query — a question being asked" },
        { value: "", label: "Unset — the model's default" },
      ],
      hint: "Asymmetric models embed these differently. Getting it wrong returns a valid vector " +
        "that retrieves worse results, with no error.",
    },
    {
      key: "truncate",
      label: "Truncate",
      type: "select",
      default: "END",
      advanced: true,
      options: [
        { value: "END", label: "END — silently cut input that is too long" },
        { value: "NONE", label: "NONE — fail instead of cutting" },
      ],
    },
    {
      key: "parameters",
      label: "Extra Parameters",
      type: "json",
      default: "",
      advanced: true,
      hint: "Merged over Input Type and Truncate for model-specific options.",
    },
  ],
  output: [
    { key: "model", type: "string", label: "Model" },
    { key: "vector_type", type: "string", label: "Vector type" },
    { key: "data", type: "array", label: "Embeddings" },
    { key: "usage", type: "object", label: "Usage (tokens)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const model = String(p.model ?? "").trim();
    if (!model) throw new Error("`model` is required");

    const raw = json(p.inputs, "inputs");
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new Error("`inputs` must be a non-empty array of texts");
    }
    // Accept both a plain list of strings and Pinecone's own {text} objects.
    const inputs = raw.map((item) =>
      typeof item === "string" ? { text: item } : item as Record<string, unknown>
    );

    const parameters = {
      ...compact({
        input_type: String(p.inputType ?? "") || undefined,
        truncate: String(p.truncate ?? "") || undefined,
      }),
      ...(json(p.parameters, "parameters") as Record<string, unknown> ?? {}),
    };

    ctx.log("info", "embedding with Pinecone", { model, count: inputs.length });
    return await new PineconeClient(ctx).request("/embed", {
      method: "POST",
      body: compact({
        model,
        inputs,
        parameters: Object.keys(parameters).length ? parameters : undefined,
      }),
    });
  },
};

export default action;
