import type { ActionDefinition } from "@w6w/types";
import { CertifierClient } from "../lib/client.ts";
import { cursorParam, limitParam } from "../lib/params.ts";

interface Input {
  cursor?: string;
  limit?: number;
}

const credentialList: ActionDefinition<Input> = {
  key: "credential-list",
  type: "read",
  resource: "credential",
  title: "List Credentials",
  description:
    "List credentials, newest page first, 20 per page by default. Use Search Credentials to filter.",
  params: [cursorParam, limitParam],
  output: [
    { key: "data", type: "array", label: "Credentials" },
    { key: "pagination", type: "object", label: "Cursors (prev, next)" },
  ],

  execute(input, ctx) {
    return new CertifierClient(ctx).json("/credentials", {
      query: { cursor: input.cursor, limit: input.limit },
    });
  },
};

export default credentialList;
