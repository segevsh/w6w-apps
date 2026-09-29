import { asOptionalJson, compact, SharetribeClient } from "../lib/client.ts";
import type { ActionDefinition } from "@w6w/types";
import { idParam, metadataParam, resourceOutput } from "../lib/params.ts";

interface Input {
  id: string;
  metadata?: unknown;
}

/**
 * `POST /v1/integration_api/transactions/update_metadata` — update a transaction's public
 * metadata in place, without transitioning it.
 *
 * Shallow-merged with the existing `metadata` object, same as a listing's — a top-level key set
 * to `null` removes it.
 */
const transactionUpdateMetadata: ActionDefinition<Input> = {
  key: "transaction-update-metadata",
  type: "perform",
  resource: "transaction",
  title: "Update Transaction Metadata",
  description: "Merge new public metadata onto a transaction, without transitioning it.",
  idempotent: true,
  params: [idParam, metadataParam],
  output: resourceOutput,

  execute(input, ctx) {
    return new SharetribeClient(ctx).command(
      "/transactions/update_metadata",
      compact({ id: input.id, metadata: asOptionalJson(input.metadata, "metadata") }),
    );
  },
};

export default transactionUpdateMetadata;
