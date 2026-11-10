import type { ActionDefinition } from "@w6w/types";
import chatbotKnowledgeList from "../actions/chatbot-knowledge-list.ts";
import { pickParams, snapshotTrigger } from "../lib/triggers.ts";

const action = chatbotKnowledgeList as unknown as ActionDefinition;

export default snapshotTrigger({
  key: "new-chatbot-knowledge",
  title: "New Chatbot Knowledge",
  description:
    "The run gets each knowledge item newly attached to a chatbot, read as a whole through chatbot-knowledge-list.",
  action,
  params: pickParams(action, ["chatbotId"]),
  sample: { id: "d38b8600-sample", type: "website", base_url: "https://example.com/" },
});
