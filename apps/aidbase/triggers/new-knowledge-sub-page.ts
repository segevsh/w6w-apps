import type { ActionDefinition } from "@w6w/types";
import knowledgeSubPageList from "../actions/knowledge-sub-page-list.ts";
import { pickParams, snapshotTrigger } from "../lib/triggers.ts";

const action = knowledgeSubPageList as unknown as ActionDefinition;

export default snapshotTrigger({
  key: "new-knowledge-sub-page",
  title: "New Knowledge Sub-Page",
  description:
    "The run gets each sub-page newly crawled under a website knowledge item, read as a whole through knowledge-sub-page-list.",
  action,
  params: pickParams(action, ["knowledgeId"]),
  idField: "page_url",
  sample: { page_url: "/billing", trained_at: "2026-11-09T10:00:00.000Z" },
});
