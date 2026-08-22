import type { ActionDefinition } from "@w6w/types";
import { compact, json, PineconeClient } from "../lib/client.ts";

/**
 * `PATCH /indexes/{index_name}` — verified against Pinecone's own `db_control`
 * OpenAPI document (`configure_index`).
 *
 * What can be changed after an index exists is a short list, and knowing which
 * side of the line a setting falls on saves a re-ingest:
 *
 *   - **changeable** — deletion protection, tags, and (on an
 *     integrated-embedding index) the read and write parameters;
 *   - **permanent** — dimension, metric, vector type, cloud, region, and the
 *     embedding model itself.
 *
 * The useful one is **deletion protection**. Turning it on is the only thing
 * standing between `index-delete` and an index; turning it off is the required
 * first step before a deliberate deletion, which is why this action is where a
 * teardown workflow starts.
 */
const action: ActionDefinition = {
  key: "index-configure",
  type: "perform",
  resource: "index",
  title: "Configure index",
  description:
    "Change what an index allows after creation — deletion protection, tags, and an integrated " +
    "index's read/write parameters. Dimension, metric and model are permanent.",
  idempotent: true,
  params: [
    {
      key: "indexName",
      label: "Index",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "deletionProtection",
      label: "Deletion Protection",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Leave unchanged" },
        { value: "enabled", label: "Enabled — deletes are refused" },
        { value: "disabled", label: "Disabled — the index can be deleted" },
      ],
    },
    {
      key: "tags",
      label: "Tags",
      type: "json",
      default: "",
      hint: 'Flat string map, e.g. `{"env":"prod"}`.',
    },
    {
      key: "readParameters",
      label: "Read Parameters",
      type: "json",
      default: "",
      advanced: true,
      hint: "Integrated-embedding indexes only.",
    },
    {
      key: "writeParameters",
      label: "Write Parameters",
      type: "json",
      default: "",
      advanced: true,
      hint: "Integrated-embedding indexes only.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Name" },
    { key: "deletion_protection", type: "string", label: "Deletion protection" },
    { key: "tags", type: "object", label: "Tags" },
    { key: "status", type: "object", label: "Status" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const indexName = String(p.indexName ?? "").trim();
    if (!indexName) throw new Error("`indexName` is required");

    const embed = compact({
      read_parameters: json(p.readParameters, "readParameters"),
      write_parameters: json(p.writeParameters, "writeParameters"),
    });
    const body = compact({
      deletion_protection: String(p.deletionProtection ?? "") || undefined,
      tags: json(p.tags, "tags"),
      embed: Object.keys(embed).length ? embed : undefined,
    });
    if (Object.keys(body).length === 0) throw new Error("nothing to change");

    ctx.log("info", "configuring Pinecone index", { indexName, fields: Object.keys(body) });
    return await new PineconeClient(ctx).request(`/indexes/${encodeURIComponent(indexName)}`, {
      method: "PATCH",
      body,
    });
  },
};

export default action;
