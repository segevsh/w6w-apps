import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import streamList from "../actions/candidate-stream-list.ts";

// Pages hold 50 records and the stream's oldest record is flagged `first_activity`, so page one
// is the newest activity (https://developer.breezy.hr/reference/getcandidatestream, verified
// 2026-11-10).
export default pollFromListAction({
  key: "new-candidate-activity",
  title: "New Candidate Activity",
  description: "The run gets each new stage move, note or interview on one candidate's stream.",
  action: streamList as unknown as ActionDefinition,
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
    const activities = (result as { activities?: unknown[] }).activities;
    return Array.isArray(activities) ? activities : [];
  },
  idOf: (item) => String((item as { _id?: unknown })._id ?? ""),
  output: [
    { key: "_id", type: "string", label: "Activity ID" },
    { key: "type", type: "string", label: "Activity type" },
    { key: "timestamp", type: "string", label: "Happened at" },
  ],
  sample: { _id: "act-101", type: "stageChange", timestamp: "2026-11-09T10:00:00Z" },
  maxPages: 1,
});
