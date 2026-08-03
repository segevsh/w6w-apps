import type { ActionDefinition } from "@w6w/types";
import { ManychatClient, type ManychatEnvelope, type ManychatPage } from "../lib/client.ts";

/**
 * Read the Page this token is bound to.
 *
 * `GET /fb/page/getInfo` takes **no parameters** — which is the clearest evidence
 * in the whole API that a token selects exactly one Page. It is also the
 * highest-limit endpoint published (100 queries per second, against 10 for most
 * reads), and returns only public profile metadata.
 *
 * `is_pro` is worth reading in a workflow: it is Manychat's plan flag, and an
 * entitlement failure on a Free page reads as a mysterious error otherwise.
 * `timezone` is the frame Manychat interprets `date`-typed field values in.
 */
const getPageInfo: ActionDefinition<Record<string, never>> = {
  key: "get-page-info",
  type: "read",
  resource: "page",
  title: "Get Page Info",
  description:
    "Read the Page this connection's token belongs to (GET /fb/page/getInfo) — name, username, " +
    "category, timezone and the `is_pro` plan flag. Takes no parameters.",
  params: [],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "data", type: "object", label: "Page" },
  ],

  execute(_input, ctx) {
    return new ManychatClient(ctx).get<ManychatEnvelope<ManychatPage>>("/fb/page/getInfo");
  },
};

export default getPageInfo;
