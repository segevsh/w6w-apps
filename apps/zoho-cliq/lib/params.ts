import type { Param } from "@w6w/types";

export const limitParam = (max = 100): Param => ({
  key: "limit",
  label: "Limit",
  type: "number",
  hint: `Maximum number of records to return (vendor maximum ${max}).`,
});

export const nextTokenParam: Param = {
  key: "nextToken",
  label: "Next token",
  type: "string",
  hint: "The `nextToken` from the previous page's output, to fetch the next page.",
};

export const chatId: Param = {
  key: "chatId",
  label: "Chat ID",
  type: "string",
  required: true,
  hint: "Chat id (e.g. `CT_1254880203691219668_11543281`). Channels have one too: it is the " +
    "channel's `chat_id`.",
};

export const channelId: Param = {
  key: "channelId",
  label: "Channel ID",
  type: "string",
  required: true,
  hint: "Channel id (e.g. `O1864232000000076001`), from List Channels.",
};

export const messageId: Param = {
  key: "messageId",
  label: "Message ID",
  type: "string",
  required: true,
  hint: "Message id (e.g. `1543320941513_23291239955324`), from List Messages.",
};

export const teamId: Param = {
  key: "teamId",
  label: "Team ID",
  type: "string",
  required: true,
  hint: "Team id, from List Teams.",
};

export const reminderId: Param = {
  key: "reminderId",
  label: "Reminder ID",
  type: "string",
  required: true,
  hint: "Reminder id, from List Reminders.",
};

export const botUniqueName: Param = {
  key: "botUniqueName",
  label: "Bot unique name",
  type: "string",
  hint: "Unique name of a bot (Bots & Tools -> Bots -> the bot's API endpoint URL).",
};

export const markAsRead: Param = {
  key: "markAsRead",
  label: "Mark as read",
  type: "boolean",
  hint: "Mark the sent message as read for the sending user (otherwise it shows as unread).",
};

/** Shared message-posting params (text, reply_to, sync_message). */
export const textParam: Param = {
  key: "text",
  label: "Text",
  type: "text",
  required: true,
  hint: "Message text (Cliq markdown). Max 4096 characters.",
};

export const replyTo: Param = {
  key: "replyTo",
  label: "Reply to message ID",
  type: "string",
  hint: "Reply to this message id (from List Messages).",
};

export const syncMessage: Param = {
  key: "syncMessage",
  label: "Return message ID",
  type: "boolean",
  hint: "Post synchronously so the response carries the new message id.",
};

/** Shared file-share params. */
export const fileParams: Param[] = [
  {
    key: "file",
    label: "File (base64)",
    type: "text",
    required: true,
    hint: "Base64-encoded file contents (max 50 MB).",
  },
  { key: "fileName", label: "File name", type: "string", default: "upload.bin" },
  {
    key: "fileMimeType",
    label: "File MIME type",
    type: "string",
    default: "application/octet-stream",
  },
  { key: "comment", label: "Comment", type: "string", hint: "Caption shown with the file." },
];
