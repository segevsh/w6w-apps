import type { ActionDefinition } from "@w6w/types";
import knowledgeFaqItemList from "../actions/knowledge-faq-item-list.ts";
import { pickParams, snapshotTrigger } from "../lib/triggers.ts";

const action = knowledgeFaqItemList as unknown as ActionDefinition;

export default snapshotTrigger({
  key: "new-faq-item",
  title: "New FAQ Item",
  description:
    "The run gets each question/answer newly added to a FAQ knowledge item, read as a whole through knowledge-faq-item-list.",
  action,
  params: pickParams(action, ["knowledgeId"]),
  sample: { id: "fq-1", question: "How do refunds work?", answer: "Within 30 days." },
});
