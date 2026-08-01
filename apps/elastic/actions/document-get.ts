import type { ActionDefinition } from "@w6w/types";
import { ElasticClient } from "../lib/client.ts";

interface Input {
  index: string;
  id: string;
  sourceIncludes?: string;
  sourceExcludes?: string;
}

const documentGet: ActionDefinition<Input> = {
  key: "document-get",
  type: "read",
  resource: "document",
  title: "Get Document",
  description: "Retrieve a single document by ID.",
  params: [
    { key: "index", label: "Index", type: "string", required: true },
    { key: "id", label: "Document ID", type: "string", required: true },
    {
      key: "sourceIncludes",
      label: "Source includes",
      type: "string",
      hint: "Comma-separated field patterns to include from `_source`.",
    },
    {
      key: "sourceExcludes",
      label: "Source excludes",
      type: "string",
      hint: "Comma-separated field patterns to exclude from `_source`.",
    },
  ],

  execute(input, ctx) {
    const client = ElasticClient.fromConnection(ctx);
    return client.request(
      `/${encodeURIComponent(input.index)}/_doc/${encodeURIComponent(input.id)}`,
      {
        query: {
          _source_includes: input.sourceIncludes,
          _source_excludes: input.sourceExcludes,
        },
      },
    );
  },
};

export default documentGet;
