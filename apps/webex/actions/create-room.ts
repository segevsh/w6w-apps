import type { ActionDefinition } from "@w6w/types";
import { unset, WebexClient } from "../lib/client.ts";

interface Input {
  title: string;
  teamId?: string;
  description?: string;
  isLocked?: boolean;
  isPublic?: boolean;
}

const createRoom: ActionDefinition<Input> = {
  key: "create-room",
  type: "perform",
  resource: "room",
  title: "Create Room",
  description: "Create a room (space), optionally as part of a team.",
  // Webex mints a new room id per call and takes no request key.
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    { key: "teamId", label: "Team ID", type: "string", hint: "Associate this room with a team." },
    { key: "description", label: "Description", type: "text" },
    { key: "isLocked", label: "Locked (moderated)", type: "boolean" },
    {
      key: "isPublic",
      label: "Public",
      type: "boolean",
      hint: "Discoverable within the org; anyone can find and join it.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Room ID" },
    { key: "title", type: "string", label: "Title" },
  ],

  execute(input, ctx) {
    return new WebexClient(ctx).request("/rooms", {
      method: "POST",
      body: {
        title: input.title,
        teamId: unset(input.teamId),
        description: unset(input.description),
        isLocked: input.isLocked,
        isPublic: input.isPublic,
      },
    });
  },
};

export default createRoom;
