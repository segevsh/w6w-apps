import type { ActionDefinition } from "@w6w/types";
import { WebexClient } from "../lib/client.ts";

interface Input {
  teamId?: string;
  type?: "direct" | "group";
  sortBy?: "id" | "lastactivity" | "created";
  max?: number;
}

interface Room {
  id: string;
  title: string;
  type: string;
  isLocked?: boolean;
  teamId?: string;
  lastActivity?: string;
  created?: string;
}

const listRooms: ActionDefinition<Input> = {
  key: "list-rooms",
  type: "read",
  resource: "room",
  title: "List Rooms",
  description: "List rooms (spaces) the connected person belongs to.",
  params: [
    { key: "teamId", label: "Team ID", type: "string", hint: "List rooms in this team only." },
    {
      key: "type",
      label: "Room type",
      type: "select",
      options: [{ value: "direct", label: "Direct (1:1)" }, { value: "group", label: "Group" }],
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      default: "lastactivity",
      options: [
        { value: "id", label: "ID" },
        { value: "lastactivity", label: "Last activity" },
        { value: "created", label: "Created" },
      ],
    },
    {
      key: "max",
      label: "Max results",
      type: "number",
      default: 50,
      validation: { min: 1, max: 1000, integer: true },
    },
  ],
  output: [
    { key: "id", type: "string", label: "Room ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "type", type: "string", label: "Type" },
  ],

  async execute(input, ctx) {
    const client = new WebexClient(ctx);
    const res = await client.request<{ items: Room[] }>("/rooms", {
      query: { teamId: input.teamId, type: input.type, sortBy: input.sortBy, max: input.max },
    });
    return res.items ?? [];
  },
};

export default listRooms;
