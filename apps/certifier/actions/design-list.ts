import type { ActionDefinition } from "@w6w/types";
import { CertifierClient } from "../lib/client.ts";
import { cursorParam, limitParam } from "../lib/params.ts";

interface Input {
  cursor?: string;
  limit?: number;
}

const designList: ActionDefinition<Input> = {
  key: "design-list",
  type: "read",
  resource: "design",
  title: "List Designs",
  description: "List the certificate and badge designs in the workspace, with PNG preview URLs.",
  params: [cursorParam, limitParam],
  output: [
    { key: "data", type: "array", label: "Designs" },
    { key: "pagination", type: "object", label: "Cursors (prev, next)" },
  ],

  execute(input, ctx) {
    return new CertifierClient(ctx).json("/designs", {
      query: { cursor: input.cursor, limit: input.limit },
    });
  },
};

export default designList;
