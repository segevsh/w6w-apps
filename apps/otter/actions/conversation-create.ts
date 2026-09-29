import type { ActionDefinition } from "@w6w/types";
import { OtterClient } from "../lib/client.ts";

interface Input {
  file: string;
  name?: string;
}

interface Output {
  status: string;
  completed_at?: string;
  file?: string;
}

const conversationCreate: ActionDefinition<Input, Output> = {
  key: "conversation-create",
  type: "perform",
  resource: "conversation",
  title: "Create Conversation From File",
  description: "Import a publicly downloadable audio or video URL as a new Otter conversation " +
    "— for pulling calls in from a Dialer or another recording source.",
  // The docs name no dedupe/idempotency key for this endpoint — a retry with
  // the same input imports the file again as a second conversation.
  idempotent: false,
  params: [
    {
      key: "file",
      label: "File URL",
      type: "string",
      required: true,
      hint: "Publicly downloadable URL to the audio/video file to process.",
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      hint: "Name for the conversation.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "completed_at", type: "string", label: "Completed at" },
    { key: "file", type: "string", label: "File" },
  ],

  execute(input, ctx) {
    ctx.log("info", "importing file into Otter", { name: input.name });
    return new OtterClient(ctx).post<Output>("/conversations", {
      file: input.file,
      name: input.name || undefined,
    });
  },
};

export default conversationCreate;
