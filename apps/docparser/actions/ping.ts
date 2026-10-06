import type { ActionDefinition } from "@w6w/types";
import { DocparserClient } from "../lib/client.ts";

const ping: ActionDefinition<Record<string, never>> = {
  key: "ping",
  type: "read",
  resource: "account",
  title: "Ping",
  description: "Check that the API key is accepted. Returns {msg: 'pong'} when it is.",
  params: [],
  output: [{ key: "msg", type: "string", label: "Message (pong)" }],

  execute(_input, ctx) {
    return new DocparserClient(ctx).json("/v1/ping");
  },
};

export default ping;
