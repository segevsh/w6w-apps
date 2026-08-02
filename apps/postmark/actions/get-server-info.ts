import type { ActionDefinition } from "@w6w/types";
import { postmarkFetch } from "../lib/client.ts";

/**
 * `GET /server` — this token's own server record (name, tracking defaults,
 * webhook URLs, inbound settings, ...). The same call the auth `test` hook
 * uses as a liveness probe.
 * https://postmarkapp.com/developer/api/server-api#get-server
 */
const getServerInfo: ActionDefinition = {
  key: "get-server-info",
  type: "read",
  resource: "server",
  title: "Get Server Info",
  description: "Get this server's configuration (name, tracking defaults, webhook URLs, ...).",
  params: [],
  output: [
    { key: "ID", type: "number", label: "Server ID" },
    { key: "Name", type: "string", label: "Name" },
    { key: "Color", type: "string", label: "Color" },
    { key: "TrackOpens", type: "boolean", label: "Track Opens (default)" },
    { key: "TrackLinks", type: "string", label: "Track Links (default)" },
  ],

  execute(_input, ctx) {
    return postmarkFetch(ctx, "/server");
  },
};

export default getServerInfo;
