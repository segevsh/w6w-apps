import type { ActionDefinition } from "@w6w/types";
import { DeepLClient } from "../lib/client.ts";

interface UsageResponse {
  character_count: number;
  character_limit: number;
  document_count?: number;
  document_limit?: number;
}

interface Output {
  characterCount: number;
  characterLimit: number;
  documentCount?: number;
  documentLimit?: number;
}

/**
 * `GET /v2/usage` — characters (and, where the account has one, a document
 * count) used and allowed in the current billing period. The same call the
 * `quota` health check makes; exposed as an action too since it is a normal,
 * useful read on its own (e.g. a workflow that checks headroom before a large
 * translate-document job).
 */
const getUsage: ActionDefinition<Record<string, never>, Output> = {
  key: "get-usage",
  type: "read",
  resource: "usage",
  title: "Get Usage",
  description: "Character (and document, where applicable) usage for the current billing period.",
  params: [],
  output: [
    { key: "characterCount", type: "number", label: "Characters used" },
    { key: "characterLimit", type: "number", label: "Character limit" },
    { key: "documentCount", type: "number", label: "Documents translated" },
    { key: "documentLimit", type: "number", label: "Document limit" },
  ],

  async execute(_input, ctx) {
    const client = new DeepLClient(ctx);
    const res = await client.request<UsageResponse>("/v2/usage");
    return {
      characterCount: res.character_count,
      characterLimit: res.character_limit,
      documentCount: res.document_count,
      documentLimit: res.document_limit,
    };
  },
};

export default getUsage;
