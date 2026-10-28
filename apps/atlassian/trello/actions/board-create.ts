import type { ActionDefinition } from "@w6w/types";
import { TrelloClient, unset } from "../lib/client.ts";

interface Input {
  name: string;
  desc?: string;
  idOrganization?: string;
  idBoardSource?: string;
  defaultLists?: boolean;
  prefsPermissionLevel?: string;
  prefsBackground?: string;
}

const boardCreate: ActionDefinition<Input> = {
  key: "board-create",
  type: "perform",
  resource: "board",
  title: "Create Board",
  description: "Create a Trello board, optionally copying it from an existing one.",
  // Trello mints a new board id per call; there is no request key to dedupe on.
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      validation: { minLength: 1, maxLength: 16384 },
    },
    { key: "desc", label: "Description", type: "text", config: { multiline: true } },
    {
      key: "idOrganization",
      label: "Workspace ID",
      type: "string",
      hint: "Workspace (organization) the board belongs to.",
    },
    {
      key: "idBoardSource",
      label: "Copy from board ID",
      type: "string",
      hint: "Create the board as a copy of this one.",
    },
    {
      key: "defaultLists",
      label: "Create default lists",
      type: "boolean",
      default: true,
      hint: "Seed the board with To Do / Doing / Done. Ignored when copying a board.",
    },
    {
      key: "prefsPermissionLevel",
      label: "Visibility",
      type: "select",
      default: "private",
      options: [
        { value: "private", label: "Private" },
        { value: "org", label: "Workspace" },
        { value: "public", label: "Public" },
      ],
    },
    {
      key: "prefsBackground",
      label: "Background",
      type: "string",
      hint: "Colour name or background id.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Board ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "url", type: "string", label: "URL" },
    { key: "shortUrl", type: "string", label: "Short URL" },
  ],

  execute(input, ctx) {
    return new TrelloClient(ctx).request("/boards", {
      method: "POST",
      query: {
        name: input.name,
        desc: unset(input.desc),
        idOrganization: unset(input.idOrganization),
        idBoardSource: unset(input.idBoardSource),
        defaultLists: input.defaultLists,
        prefs_permissionLevel: unset(input.prefsPermissionLevel),
        prefs_background: unset(input.prefsBackground),
      },
    });
  },
};

export default boardCreate;
