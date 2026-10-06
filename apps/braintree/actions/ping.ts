import type { ActionDefinition } from "@w6w/types";
import { BraintreeClient } from "../lib/client.ts";

/** `query { ping }` — returns the literal string `pong` for any valid credential. */
const ping: ActionDefinition<Record<string, never>> = {
  key: "ping",
  type: "read",
  resource: "connection",
  title: "Ping",
  description: "Check that the connection's credentials are accepted. Braintree answers `pong`.",
  params: [],
  output: [
    { key: "ping", type: "string", label: "Always `pong`" },
    { key: "environment", type: "string", label: "Environment the call went to" },
  ],

  async execute(_input, ctx) {
    const client = new BraintreeClient(ctx);
    const data = await client.execute<{ ping?: string }>("query { ping }");
    return { ping: data.ping, environment: client.environment };
  },
};

export default ping;
