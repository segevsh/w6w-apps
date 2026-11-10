import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import conversationList from "../actions/candidate-conversation-list.ts";

// The conversation is "ordered newest first" and holds 50 per page
// (https://developer.breezy.hr/reference/getcandidateconversation, verified 2026-11-10).
export default pollFromListAction({
  key: "new-candidate-message",
  title: "New Candidate Message",
  description: "The run gets each new message or interview proposal in one candidate's thread.",
  action: conversationList as unknown as ActionDefinition,
  params: [
    { key: "companyId", label: "Company ID", type: "string", required: true },
    { key: "positionId", label: "Position ID", type: "string", required: true },
    { key: "candidateId", label: "Candidate ID", type: "string", required: true },
  ],
  input: (params: { companyId: string; positionId: string; candidateId: string }) => ({
    companyId: params.companyId,
    positionId: params.positionId,
    candidateId: params.candidateId,
  }),
  items: (result) => {
    const messages = (result as { messages?: unknown[] }).messages;
    return Array.isArray(messages) ? messages : [];
  },
  idOf: (item) => String((item as { _id?: unknown })._id ?? ""),
  output: [
    { key: "_id", type: "string", label: "Message ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "timestamp", type: "string", label: "Sent at" },
  ],
  sample: { _id: "msg-101", type: "message", timestamp: "2026-11-09T10:00:00Z" },
  maxPages: 1,
});
