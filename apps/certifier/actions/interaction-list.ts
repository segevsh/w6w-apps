import type { ActionDefinition } from "@w6w/types";
import { CertifierClient } from "../lib/client.ts";
import { cursorParam, limitParam } from "../lib/params.ts";

interface Input {
  credentialId?: string;
  cursor?: string;
  limit?: number;
}

const interactionList: ActionDefinition<Input> = {
  key: "interaction-list",
  type: "read",
  resource: "credential-interaction",
  title: "List Credential Interactions",
  description: "List what recipients and guests did with credentials: views, shares, downloads, " +
    "verifications. Filter to one credential or read the whole workspace.",
  params: [
    {
      key: "credentialId",
      label: "Credential ID",
      type: "string",
      hint: "Only this credential's interactions. Leave empty for all.",
    },
    cursorParam,
    limitParam,
  ],
  output: [
    { key: "data", type: "array", label: "Interactions" },
    { key: "pagination", type: "object", label: "Cursors (prev, next)" },
  ],

  execute(input, ctx) {
    return new CertifierClient(ctx).json("/credential-interactions", {
      query: { credentialId: input.credentialId?.trim(), cursor: input.cursor, limit: input.limit },
    });
  },
};

export default interactionList;
