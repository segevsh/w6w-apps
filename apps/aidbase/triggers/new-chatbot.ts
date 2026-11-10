import type { ActionDefinition } from "@w6w/types";
import chatbotList from "../actions/chatbot-list.ts";
import { pickParams, snapshotTrigger } from "../lib/triggers.ts";

const action = chatbotList as unknown as ActionDefinition;

export default snapshotTrigger({
  key: "new-chatbot",
  title: "New Chatbot",
  description:
    "The run gets each chatbot newly created in the account, read as a whole through chatbot-list (the endpoint is an unpaginated list).",
  action,
  params: pickParams(action, []),
  sample: { id: "1572f60b", public_id: "p-sample", title: "Website Chatbot" },
});
