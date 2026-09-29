import type { ActionDefinition } from "@w6w/types";
import { unset, WebexClient } from "../lib/client.ts";

interface Input {
  roomId: string;
  title: string;
  description?: string;
  isLocked?: boolean;
  isPublic?: boolean;
  isAnnouncementOnly?: boolean;
}

const updateRoom: ActionDefinition<Input> = {
  key: "update-room",
  type: "perform",
  resource: "room",
  title: "Update Room",
  description: "Update a room's title or settings. A full replace — Webex requires `title` even " +
    "when only changing another field.",
  idempotent: true,
  params: [
    { key: "roomId", label: "Room ID", type: "string", required: true },
    { key: "title", label: "Title", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    { key: "isLocked", label: "Locked (moderated)", type: "boolean" },
    { key: "isPublic", label: "Public", type: "boolean" },
    {
      key: "isAnnouncementOnly",
      label: "Announcement mode",
      type: "boolean",
      advanced: true,
      hint: "Only moderators can post.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Room ID" },
    { key: "title", type: "string", label: "Title" },
  ],

  execute(input, ctx) {
    return new WebexClient(ctx).request(`/rooms/${encodeURIComponent(input.roomId)}`, {
      method: "PUT",
      body: {
        title: input.title,
        description: unset(input.description),
        isLocked: input.isLocked,
        isPublic: input.isPublic,
        isAnnouncementOnly: input.isAnnouncementOnly,
      },
    });
  },
};

export default updateRoom;
