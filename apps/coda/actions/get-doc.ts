import type { ActionDefinition } from "@w6w/types";
import { CodaClient } from "../lib/client.ts";

interface Input {
  docId: string;
}

interface Doc {
  id: string;
  type: string;
  href: string;
  name: string;
  ownerName?: string;
  workspaceId?: string;
}

/** GET /docs/{docId} */
const getDoc: ActionDefinition<Input, Doc> = {
  key: "get-doc",
  type: "read",
  resource: "doc",
  title: "Get Doc",
  description: "Retrieve metadata for a single doc.",
  params: [
    { key: "docId", label: "Doc ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Doc ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "href", type: "string", label: "API URL" },
  ],

  execute(input, ctx) {
    const client = new CodaClient(ctx);
    return client.request<Doc>(`/docs/${input.docId}`);
  },
};

export default getDoc;
