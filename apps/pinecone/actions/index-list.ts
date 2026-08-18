import type { ActionDefinition } from "@w6w/types";
import { PineconeClient } from "../lib/client.ts";

/**
 * `GET /indexes` — verified against Pinecone's own `db_control` OpenAPI
 * document (`list_indexes`).
 *
 * Everything the API key's **project** contains. A Pinecone key is
 * project-scoped, so this is also the answer to "am I pointed at the right
 * project" — a key from the wrong one lists successfully and returns nothing.
 *
 * The field worth reading is **`host`**: it is the data-plane address of each
 * index, and it is what every upsert and query actually talks to. Passing it
 * into a data action as **Index Host** skips the describe call those actions
 * otherwise make.
 */
const action: ActionDefinition = {
  key: "index-list",
  type: "read",
  resource: "index",
  title: "List indexes",
  description:
    "Every index in this API key's project, with the data-plane host, dimension, metric and " +
    "readiness of each.",
  params: [],
  output: [
    { key: "indexes", type: "array", label: "Indexes" },
  ],

  async execute(_input, ctx) {
    return await new PineconeClient(ctx).request("/indexes");
  },
};

export default action;
