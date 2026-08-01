import type { ActionDefinition } from "@w6w/types";
import { ElasticClient } from "../lib/client.ts";

interface Input {
  index: string;
  mappings?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  aliases?: Record<string, unknown>;
}

const indexCreate: ActionDefinition<Input> = {
  key: "index-create",
  type: "perform",
  resource: "index",
  title: "Create Index",
  description: "Create a new index, optionally with mappings, settings and aliases.",
  idempotent: false,
  params: [
    { key: "index", label: "Index name", type: "string", required: true },
    {
      key: "mappings",
      label: "Mappings",
      type: "json",
      hint: "Field mapping object, per the Elasticsearch mapping API.",
    },
    {
      key: "settings",
      label: "Settings",
      type: "json",
      hint: "Index settings object (shards, replicas, analysis, …).",
    },
    {
      key: "aliases",
      label: "Aliases",
      type: "json",
      hint: "Alias object to create alongside the index.",
    },
  ],

  execute(input, ctx) {
    const client = ElasticClient.fromConnection(ctx);
    const body: Record<string, unknown> = {};
    if (input.mappings !== undefined) body.mappings = input.mappings;
    if (input.settings !== undefined) body.settings = input.settings;
    if (input.aliases !== undefined) body.aliases = input.aliases;
    return client.request(`/${encodeURIComponent(input.index)}`, {
      method: "PUT",
      body: Object.keys(body).length ? body : undefined,
    });
  },
};

export default indexCreate;
