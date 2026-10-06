import type { ActionDefinition } from "@w6w/types";
import { WebMergeClient } from "../lib/client.ts";

interface Input {
  id: string;
  key?: string;
  data?: Record<string, unknown>;
  testMode?: boolean;
  download?: boolean;
}

/**
 * Merge data into a document at its merge URL, optionally in test mode and optionally returning the file (POST /merge/{id}/{key}). When no merge key is given it is looked up first.
 */
const documentMerge: ActionDefinition<Input> = {
  key: "document-merge",
  type: "perform",
  resource: "document",
  title: "Merge Document",
  description:
    "Merge data into a document at its merge URL, optionally in test mode and optionally returning the file (POST /merge/{id}/{key}). When no merge key is given it is looked up first.",
  idempotent: false,
  params: [
    {
      key: "id",
      label: "Document ID",
      type: "string",
      required: true,
      hint: "The numeric document ID from Get a List of Documents.",
    },
    {
      key: "key",
      label: "Merge key",
      type: "string",
      hint: "The document's merge key; looked up via Get Document when empty.",
    },
    {
      key: "data",
      label: "Merge data",
      type: "json",
      hint:
        "Name/value pairs or nested JSON merged into the template. Extra fields can feed deliveries.",
    },
    { key: "testMode", label: "Test mode", type: "boolean", hint: "Merge in test mode (test=1)." },
    {
      key: "download",
      label: "Return the file",
      type: "boolean",
      hint:
        "download=1: return the merged file base64-encoded in the result instead of just success.",
    },
  ],
  output: [
    { key: "success", type: "number", label: "1 on success" },
    {
      key: "file",
      type: "object",
      label: "{ contentBase64, contentType, sizeBytes } when download is set",
    },
  ],

  async execute(input, ctx) {
    const client = new WebMergeClient(ctx);
    const key = input.key || await client.mergeKey("documents", input.id);
    return client.requestRoot(
      `/merge/${encodeURIComponent(input.id)}/${encodeURIComponent(key)}`,
      {
        method: "POST",
        query: { test: input.testMode ? 1 : undefined, download: input.download ? 1 : undefined },
        body: input.data ?? {},
      },
    );
  },
};

export default documentMerge;
