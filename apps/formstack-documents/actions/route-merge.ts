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
 * Merge data through a data route at its merge URL — one POST, many documents (POST /route/{id}/{key}). When no merge key is given it is looked up first. With download set, two or more documents come back as a JSON envelope of base64 files rather than one PDF.
 */
const routeMerge: ActionDefinition<Input> = {
  key: "route-merge",
  type: "perform",
  resource: "route",
  title: "Merge Data Route",
  description:
    "Merge data through a data route at its merge URL \u2014 one POST, many documents (POST /route/{id}/{key}). When no merge key is given it is looked up first. With download set, two or more documents come back as a JSON envelope of base64 files rather than one PDF.",
  idempotent: false,
  params: [
    {
      key: "id",
      label: "Data route ID",
      type: "string",
      required: true,
      hint: "The numeric data route ID from Get a List of Data Routes.",
    },
    {
      key: "key",
      label: "Merge key",
      type: "string",
      hint: "The route's merge key; looked up via Get Data Route when empty.",
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
      label: "{ contentBase64, contentType, sizeBytes } for a single downloaded document",
    },
    {
      key: "files",
      type: "array",
      label: "[{ name, file_contents }] for two or more downloaded documents",
    },
  ],

  async execute(input, ctx) {
    const client = new WebMergeClient(ctx);
    const key = input.key || await client.mergeKey("routes", input.id);
    return client.requestRoot(
      `/route/${encodeURIComponent(input.id)}/${encodeURIComponent(key)}`,
      {
        method: "POST",
        query: { test: input.testMode ? 1 : undefined, download: input.download ? 1 : undefined },
        body: input.data ?? {},
      },
    );
  },
};

export default routeMerge;
