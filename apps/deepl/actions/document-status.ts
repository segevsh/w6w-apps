import type { ActionDefinition } from "@w6w/types";
import { DeepLClient } from "../lib/client.ts";

interface Input {
  documentId: string;
  documentKey: string;
}

interface StatusResponse {
  document_id: string;
  status: "queued" | "translating" | "done" | "error";
  seconds_remaining?: number;
  billed_characters?: number;
  error_message?: string;
}

interface Output {
  status: "queued" | "translating" | "done" | "error";
  secondsRemaining?: number;
  billedCharacters?: number;
  errorMessage?: string;
}

/**
 * `POST /v2/document/{document_id}` — check on a job started by
 * `translate-document`. Meant to be polled by the workflow (e.g. a delay +
 * loop step) rather than by this action, which makes exactly one call.
 */
const documentStatus: ActionDefinition<Input, Output> = {
  key: "document-status",
  type: "read",
  resource: "document",
  title: "Get Document Status",
  description: "Check the translation status of a document submitted via Translate Document.",
  params: [
    { key: "documentId", label: "Document ID", type: "string", required: true },
    { key: "documentKey", label: "Document Key", type: "string", required: true },
  ],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "secondsRemaining", type: "number", label: "Seconds remaining" },
    { key: "billedCharacters", type: "number", label: "Billed characters" },
    { key: "errorMessage", type: "string", label: "Error message" },
  ],

  async execute(input, ctx) {
    const client = new DeepLClient(ctx);
    const res = await client.request<StatusResponse>(`/v2/document/${input.documentId}`, {
      method: "POST",
      body: { document_key: input.documentKey },
    });
    return {
      status: res.status,
      secondsRemaining: res.seconds_remaining,
      billedCharacters: res.billed_characters,
      errorMessage: res.error_message,
    };
  },
};

export default documentStatus;
