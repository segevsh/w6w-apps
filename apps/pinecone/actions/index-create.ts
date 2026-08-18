import type { ActionDefinition } from "@w6w/types";
import { compact, json, PineconeClient } from "../lib/client.ts";

/**
 * `POST /indexes` — verified against Pinecone's own `db_control` OpenAPI
 * document (`create_index`).
 *
 * ## Serverless only, deliberately
 *
 * Pinecone's `spec` is a `oneOf` over three deployment models: `serverless`,
 * `pod` and `byoc`. This action creates **serverless** indexes and nothing
 * else. Pod-based indexes are the legacy model — they are sized in pods and
 * replicas, they are the only thing collections work with, and creating one
 * from a workflow commits an account to a capacity decision that belongs in a
 * console with a price next to it. BYOC needs infrastructure that exists before
 * the API call.
 *
 * ## Dimension and metric are permanent
 *
 * Neither can be changed after creation: getting them wrong means deleting the
 * index and re-embedding everything in it. The dimension must match the
 * embedding model that will fill it (1536 for OpenAI `text-embedding-3-small`,
 * 1024 for Pinecone's `multilingual-e5-large`, 3072 for `text-embedding-3-large`),
 * and a mismatch is not caught until the first upsert, which fails with
 * *"Vector dimension X does not match the dimension of the index Y"*.
 *
 * A **sparse** index is the exception: it carries no dimension at all and its
 * metric must be `dotproduct`. Both rules are enforced here rather than at the
 * API, because Pinecone's message for them is terse.
 *
 * ## Creating is not the same as ready
 *
 * The response comes back with `status.state: "Initializing"`. Data-plane calls
 * against an index in that state fail; `index-get` is how a workflow waits.
 */
const action: ActionDefinition = {
  key: "index-create",
  type: "perform",
  resource: "index",
  title: "Create index",
  description:
    "Create a serverless index. Dimension and metric are permanent — changing either means " +
    "deleting the index and re-embedding everything in it.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      default: "",
      placeholder: "product-embeddings",
      hint: "1–45 characters, lower-case alphanumeric and `-`, starting and ending " +
        "alphanumeric.",
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
      placeholder: "us-east-1",
      hint: "A region the chosen cloud offers — `us-east-1` on AWS, `us-central1` on GCP, " +
        "`eastus2` on Azure.",
    },
    {
      key: "vectorType",
      label: "Vector Type",
      type: "select",
      default: "dense",
      options: [
        { value: "dense", label: "Dense — ordinary embeddings" },
        { value: "sparse", label: "Sparse — keyword/lexical vectors" },
      ],
    },
    {
      key: "dimension",
      label: "Dimension",
      type: "number",
      default: 1536,
      showIf: { "==": [{ var: "vectorType" }, "dense"] },
      hint: "Must match your embedding model exactly, and cannot be changed afterwards. 1536 " +
        "for OpenAI text-embedding-3-small, 1024 for multilingual-e5-large.",
    },
    {
      key: "metric",
      label: "Metric",
      type: "select",
      default: "cosine",
      options: [
        { value: "cosine", label: "Cosine — the usual choice for text embeddings" },
        { value: "dotproduct", label: "Dot product — required for sparse and hybrid" },
        { value: "euclidean", label: "Euclidean" },
      ],
      hint: "Permanent. A sparse index must use dot product.",
    },
    {
      key: "deletionProtection",
      label: "Deletion Protection",
      type: "boolean",
      default: false,
      hint: "On, Pinecone refuses to delete this index until it is turned off — worth it for " +
        "anything a workflow can reach.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "json",
      default: "",
      advanced: true,
      hint: 'Flat string map, e.g. `{"env":"prod"}`.',
    },
  ],
  output: [
    { key: "name", type: "string", label: "Name" },
    { key: "host", type: "string", label: "Data-plane host" },
    { key: "dimension", type: "number", label: "Dimension" },
    { key: "metric", type: "string", label: "Metric" },
    { key: "status", type: "object", label: "Status" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");
    const cloud = String(p.cloud ?? "aws");
    const region = String(p.region ?? "").trim();
    if (!region) throw new Error("`region` is required");

    const vectorType = String(p.vectorType ?? "dense");
    const metric = String(p.metric ?? (vectorType === "sparse" ? "dotproduct" : "cosine"));
    const dimension = p.dimension === undefined || p.dimension === ""
      ? undefined
      : Number(p.dimension);

    // Pinecone's own rules, enforced here because its messages for them are
    // terse and arrive after the index exists in some half state.
    if (vectorType === "sparse") {
      if (dimension !== undefined) {
        throw new Error("a sparse index carries no `dimension` — leave it unset");
      }
      if (metric !== "dotproduct") {
        throw new Error(`a sparse index must use the dotproduct metric, not ${metric}`);
      }
    } else if (!Number.isFinite(dimension) || (dimension as number) < 1) {
      throw new Error("`dimension` is required for a dense index, and must match your model");
    }

    ctx.log("info", "creating Pinecone index", { name, cloud, region, vectorType, dimension });

    return await new PineconeClient(ctx).request("/indexes", {
      method: "POST",
      body: compact({
        name,
        metric,
        vector_type: vectorType,
        dimension: vectorType === "sparse" ? undefined : dimension,
        deletion_protection: p.deletionProtection === true ? "enabled" : "disabled",
        tags: json(p.tags, "tags"),
        spec: { serverless: { cloud, region } },
      }),
    });
  },
};

export default action;
