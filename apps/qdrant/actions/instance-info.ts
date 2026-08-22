import type { ActionDefinition } from "@w6w/types";
import { QdrantClient } from "../lib/client.ts";

/**
 * `GET /` — which Qdrant this is.
 *
 * Small and worth having, because Qdrant is a database people run themselves
 * and versions drift. The `points/query` endpoint this app is built on replaced
 * `points/search` at a particular version, and an instance older than that will
 * refuse every query in a way that looks like a bad request rather than an old
 * server.
 *
 * So the first thing to check when a workflow that works against one instance
 * fails against another is usually the version, and this is where it is.
 */
const action: ActionDefinition = {
  key: "instance-info",
  type: "read",
  resource: "instance",
  title: "Get instance info",
  description:
    "Which Qdrant this is. Version drift is real on a self-hosted database, and an old instance " +
    "refuses `points/query` in a way that looks like a bad request.",
  params: [],
  output: [
    { key: "title", type: "string", label: "Always qdrant - vector search engine" },
    { key: "version", type: "string", label: "The server version" },
    { key: "commit", type: "string", label: "The build commit" },
  ],

  async execute(_input, ctx) {
    return await new QdrantClient(ctx).request("/");
  },
};

export default action;
