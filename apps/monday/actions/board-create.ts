import type { ActionDefinition } from "@w6w/types";
import { MondayClient } from "../lib/client.ts";

interface Input {
  name: string;
  kind: string;
  templateId?: string;
  workspaceId?: string;
}

const MUTATION = `
  mutation CreateBoard($name: String!, $kind: BoardKind!, $templateId: ID, $workspaceId: ID) {
    create_board(
      board_name: $name
      board_kind: $kind
      template_id: $templateId
      workspace_id: $workspaceId
    ) {
      id
      name
      board_kind
    }
  }
`;

const boardCreate: ActionDefinition<Input> = {
  key: "board-create",
  type: "perform",
  resource: "board",
  title: "Create Board",
  description: "Create a new board.",
  // create_board mints a fresh board id every call and takes no client key,
  // so a retry files a duplicate.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "kind",
      label: "Kind",
      type: "select",
      required: true,
      default: "public",
      options: [
        { value: "public", label: "Public" },
        { value: "private", label: "Private" },
        { value: "share", label: "Shareable" },
      ],
    },
    {
      key: "templateId",
      label: "Template ID",
      type: "string",
      advanced: true,
      hint: "Optional board template to copy structure from.",
    },
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "string",
      advanced: true,
      hint: "Optional workspace to create the board in. Defaults to Main workspace.",
    },
  ],
  output: [
    { key: "create_board.id", type: "string", label: "Board ID" },
    { key: "create_board.name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new MondayClient(ctx).query(MUTATION, {
      name: input.name,
      kind: input.kind,
      templateId: input.templateId || undefined,
      workspaceId: input.workspaceId || undefined,
    });
  },
};

export default boardCreate;
