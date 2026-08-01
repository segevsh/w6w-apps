import type { ActionDefinition } from "@w6w/types";
import { ElasticClient } from "../lib/client.ts";

interface Input {
  index: string;
}

const indexDelete: ActionDefinition<Input> = {
  key: "index-delete",
  type: "perform",
  resource: "index",
  title: "Delete Index",
  description: "Delete an index and all the documents it holds. Irreversible.",
  idempotent: true,
  params: [
    { key: "index", label: "Index name", type: "string", required: true },
  ],

  execute(input, ctx) {
    const client = ElasticClient.fromConnection(ctx);
    return client.request(`/${encodeURIComponent(input.index)}`, { method: "DELETE" });
  },
};

export default indexDelete;
