import type { ActionDefinition } from "@w6w/types";
import { GristClient } from "../lib/client.ts";

interface Input {
  docId: string;
}

interface Output {
  id: string;
  name: string;
  access?: string;
  isPinned?: boolean;
  urlId?: string | null;
  workspace?: Record<string, unknown>;
}

/**
 * `GET /docs/{docId}`.
 *
 * Metadata only — the document's name, the caller's `access` level, and the
 * workspace (and through it the org) it lives in. It reads none of the contents,
 * which makes it the cheapest way to confirm a docId is real and reachable
 * before a workflow starts writing to it.
 *
 * `access` is worth branching on: it is the *caller's* role, so a workflow can
 * tell "the doc is gone" from "this key can only read it".
 */
const describeDoc: ActionDefinition<Input, Output> = {
  key: "describe-doc",
  type: "read",
  resource: "doc",
  title: "Describe Document",
  description:
    "Fetch a document's metadata — name, your access level, and the workspace and org it belongs to. Reads no data.",
  params: [
    {
      key: "docId",
      label: "Document ID",
      type: "string",
      required: true,
      hint: "The long id from the doc URL, or an `id` from `list-workspaces`.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Document ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "access", type: "string", label: "Your access level" },
    { key: "isPinned", type: "boolean", label: "Pinned" },
    { key: "urlId", type: "string", label: "URL ID" },
    { key: "workspace", type: "object", label: "Workspace (with its org)" },
  ],

  execute(input, ctx) {
    const client = GristClient.fromConnection(ctx);
    return client.request<Output>(`/docs/${encodeURIComponent(input.docId)}`);
  },
};

export default describeDoc;
