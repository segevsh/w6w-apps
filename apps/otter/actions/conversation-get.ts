import type { ActionDefinition } from "@w6w/types";
import { OtterClient, type OtterConversation, type OtterMeta } from "../lib/client.ts";

interface Input {
  id: string;
  include: string[];
}

interface Output {
  meta: OtterMeta;
  data: OtterConversation;
}

const conversationGet: ActionDefinition<Input, Output> = {
  key: "conversation-get",
  type: "read",
  resource: "conversation",
  title: "Get Conversation",
  description: "Get a conversation's summary and details, plus the requested relationships " +
    "(action items, insights, outline, transcript).",
  params: [
    { key: "id", label: "Conversation ID", type: "string", required: true },
    {
      key: "include",
      label: "Include",
      type: "multiselect",
      required: true,
      options: [
        { value: "action_items", label: "Action items" },
        { value: "insights", label: "Insights" },
        { value: "outline", label: "Outline" },
        { value: "transcript", label: "Transcript" },
        { value: "all", label: "All available relationships" },
      ],
      hint: "The docs mark this required — Otter returns no relationships without it.",
    },
  ],
  output: [
    { key: "data.id", type: "string", label: "Conversation ID" },
    { key: "data.title", type: "string", label: "Title" },
    { key: "data.url", type: "string", label: "URL" },
    { key: "data.abstract_summary", type: "string", label: "Summary" },
    { key: "data.relationships", type: "object", label: "Requested relationships" },
  ],

  execute(input, ctx) {
    return new OtterClient(ctx).get<Output>(`/conversations/${encodeURIComponent(input.id)}`, {
      include: input.include.join(","),
    });
  },
};

export default conversationGet;
