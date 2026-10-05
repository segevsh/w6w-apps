import type { ActionDefinition } from "@w6w/types";
import { Ds24Client } from "../lib/client.ts";

type Input = Record<string, never>;

const ping: ActionDefinition<Input> = {
  key: "ping",
  type: "read",
  title: "Ping",
  description: "Test the connection to Digistore24 and read the server time. Requires a valid key.",
  params: [],
  output: [
    { key: "server_time", type: "string", label: "Server time" },
  ],

  execute(_input, ctx) {
    return new Ds24Client(ctx).call("ping", {});
  },
};

export default ping;
