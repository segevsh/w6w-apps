import type { ActionDefinition } from "@w6w/types";
import { ElasticClient } from "../lib/client.ts";

interface Input {
  index: string;
}

const indexMappingGet: ActionDefinition<Input> = {
  key: "index-mapping-get",
  type: "read",
  resource: "index",
  title: "Get Index Mapping",
  description: "Retrieve the field mapping for an index.",
  params: [
    { key: "index", label: "Index name", type: "string", required: true },
  ],

  execute(input, ctx) {
    const client = ElasticClient.fromConnection(ctx);
    return client.request(`/${encodeURIComponent(input.index)}/_mapping`);
  },
};

export default indexMappingGet;
