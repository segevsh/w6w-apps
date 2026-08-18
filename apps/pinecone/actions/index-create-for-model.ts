import type { ActionDefinition } from "@w6w/types";
import { compact, json, PineconeClient } from "../lib/client.ts";

/**
 * `POST /indexes/create-for-model` — verified against Pinecone's own
 * `db_control` OpenAPI document (`create_index_for_model`).
 *
 * An **integrated-embedding** index: Pinecone owns the embedding model, so
 * records go in as *text* and queries go in as *text*, and no vector ever
 * crosses the wire. For most workflows this is the version that should be used
 * — it removes the two failure modes that cause the majority of vector-database
 * bugs, namely embedding the query with a different model from the documents,
 * and a dimension mismatch nobody notices until upsert.
 *
 * It also removes a choice: **the model is fixed at creation and cannot be
 * changed.** Moving to another model means a new index and a full re-ingest.
 * The read and write parameters *can* be updated later; the model cannot.
 *
 * `field_map` is the part that is easy to get wrong. It maps Pinecone's `text`
 * input to **the field name in your own records** — `{"text": "chunk_text"}`
 * means "embed whatever is in `chunk_text`". Records upserted without that
 * exact field are rejected, and the name is not inferable later from the data,
 * only from `index-get`'s `embed.field_map`.
 *
 * Dimension and metric are absent here on purpose: the model decides both.
 */
const action: ActionDefinition = {
  key: "index-create-for-model",
  type: "perform",
  resource: "index",
  title: "Create index for a model",
  description:
    "Create an index with integrated embedding — text in, text out, no vectors. The model is " +
    "permanent, and the field map names which field of your records gets embedded.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      default: "",
      placeholder: "docs-search",
    },
    {
      key: "cloud",
      label: "Cloud",
      type: "select",
      required: true,
      default: "aws",
      options: [
        { value: "aws", label: "AWS" },
        { value: "gcp", label: "GCP" },
        { value: "azure", label: "Azure" },
      ],
    },
    {
      key: "region",
      label: "Region",
      type: "string",
      required: true,
      default: "us-east-1",
    },
    {
      key: "model",
      label: "Embedding Model",
      type: "string",
      required: true,
      default: "multilingual-e5-large",
      placeholder: "multilingual-e5-large",
      hint: "Permanent. `model-list` shows what this project can use — llama-text-embed-v2, " +
        "multilingual-e5-large, pinecone-sparse-english-v0 and friends.",
    },
    {
      key: "textField",
      label: "Text Field",
      type: "string",
      required: true,
      default: "chunk_text",
      hint: "The field in YOUR records whose text Pinecone embeds. Becomes " +
        '`field_map: {"text": "<this>"}`, and records without that exact field are rejected.',
    },
    {
      key: "metric",
      label: "Metric",
      type: "select",
      default: "",
      advanced: true,
      options: [
        { value: "", label: "The model's own default" },
        { value: "cosine", label: "Cosine" },
        { value: "dotproduct", label: "Dot product" },
        { value: "euclidean", label: "Euclidean" },
      ],
    },
    {
      key: "readParameters",
      label: "Read Parameters",
      type: "json",
      default: "",
      advanced: true,
      hint: 'Model-specific, applied when embedding a QUERY, e.g. `{"input_type":"query"}`.',
    },
    {
      key: "writeParameters",
      label: "Write Parameters",
      type: "json",
      default: "",
      advanced: true,
      hint: 'Model-specific, applied when embedding a RECORD, e.g. `{"input_type":"passage"}`.',
    },
    {
      key: "deletionProtection",
      label: "Deletion Protection",
      type: "boolean",
      default: false,
    },
    { key: "tags", label: "Tags", type: "json", default: "", advanced: true },
  ],
  output: [
    { key: "name", type: "string", label: "Name" },
    { key: "host", type: "string", label: "Data-plane host" },
    { key: "embed", type: "object", label: "Integrated embedding" },
    { key: "status", type: "object", label: "Status" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");
    const region = String(p.region ?? "").trim();
    if (!region) throw new Error("`region` is required");
    const model = String(p.model ?? "").trim();
    if (!model) throw new Error("`model` is required — it cannot be changed later");
    const textField = String(p.textField ?? "").trim();
    if (!textField) {
      throw new Error("`textField` is required — it names the field Pinecone will embed");
    }

    ctx.log("info", "creating Pinecone integrated index", { name, model, textField });

    return await new PineconeClient(ctx).request("/indexes/create-for-model", {
      method: "POST",
      body: compact({
        name,
        cloud: String(p.cloud ?? "aws"),
        region,
        deletion_protection: p.deletionProtection === true ? "enabled" : "disabled",
        tags: json(p.tags, "tags"),
        embed: compact({
          model,
          metric: String(p.metric ?? "") || undefined,
          // Pinecone's `text` input, mapped to the caller's own field name.
          field_map: { text: textField },
          read_parameters: json(p.readParameters, "readParameters"),
          write_parameters: json(p.writeParameters, "writeParameters"),
        }),
      }),
    });
  },
};

export default action;
