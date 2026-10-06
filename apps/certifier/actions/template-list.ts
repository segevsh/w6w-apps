import type { ActionDefinition } from "@w6w/types";
import { CertifierClient } from "../lib/client.ts";
import { cursorParam, limitParam } from "../lib/params.ts";

interface Input {
  cursor?: string;
  limit?: number;
}

const templateList: ActionDefinition<Input> = {
  key: "template-list",
  type: "read",
  resource: "credential-template",
  title: "List Credential Templates",
  description:
    "List credential templates (the API calls them groups): each one fixes the designs, name " +
    "and learning-event link a credential is issued with.",
  params: [cursorParam, limitParam],
  output: [
    { key: "data", type: "array", label: "Credential templates" },
    { key: "pagination", type: "object", label: "Cursors (prev, next)" },
  ],

  execute(input, ctx) {
    return new CertifierClient(ctx).json("/groups", {
      query: { cursor: input.cursor, limit: input.limit },
    });
  },
};

export default templateList;
