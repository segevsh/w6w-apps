import type { ActionDefinition } from "@w6w/types";
import { MailcheckClient } from "../lib/client.ts";

interface Input {
  pageSize?: number;
  pageToken?: string;
}

/**
 * `GET /v1/emails/operations` — list this account's batch check operations.
 * Source: https://app.mailcheck.co/openapi.json
 * (`paths["/v1/emails/operations"]`, `operationId: "listOperations"`).
 */
const batchOperationList: ActionDefinition<Input> = {
  key: "batch-operation-list",
  type: "read",
  resource: "batch",
  title: "List Batch Operations",
  description: "List batch check operations for the authenticated account.",
  params: [
    { key: "pageSize", label: "Page Size", type: "number" },
    { key: "pageToken", label: "Page Token", type: "string" },
  ],
  output: [
    { key: "operations", type: "array", label: "Operations" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  execute(input, ctx) {
    const client = new MailcheckClient(ctx);
    return client.request("/v1/emails/operations", {
      query: { page_size: input.pageSize, page_token: input.pageToken },
    });
  },
};

export default batchOperationList;
