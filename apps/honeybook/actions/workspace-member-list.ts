import type { ActionDefinition } from "@w6w/types";
import { encodeId, HoneyBookClient, toList } from "../lib/client.ts";

interface Input {
  workspaceId: string;
  page?: number;
  perPage?: number;
  include?: string[] | string;
}

const workspaceMemberList: ActionDefinition<Input> = {
  key: "workspace-member-list",
  type: "read",
  resource: "workspace",
  title: "List Workspace Members",
  description:
    "List a workspace's members. Only a workspace member, or a moderator-or-greater of the workspace's company, may read the member list; anyone else gets a 404.",
  params: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "string",
      required: true,
      hint: "Workspace id (BSON ObjectId hex).",
    },
    { key: "page", label: "Page", type: "number", hint: "1-indexed page number (default 1)." },
    { key: "perPage", label: "Page size", type: "number", hint: "Page size, 1-100 (default 25)." },
    {
      key: "include",
      label: "Include",
      type: "multiselect",
      hint: "Relations to populate.",
      options: [{ "value": "user", "label": "User" }, { "value": "contact", "label": "Contact" }],
    },
  ],
  output: [
    { key: "data", type: "array", label: "Data" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    const result = await new HoneyBookClient(ctx).request(
      "GET",
      `/workspaces/${encodeId(input.workspaceId)}/members`,
      {
        query: {
          page: input.page,
          per_page: input.perPage,
          include: toList(input.include),
        },
      },
    );
    return result;
  },
};

export default workspaceMemberList;
