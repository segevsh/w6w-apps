import type { ActionDefinition } from "@w6w/types";
import knowledgeList from "../actions/knowledge-list.ts";
import { pickParams, snapshotTrigger } from "../lib/triggers.ts";

const action = knowledgeList as unknown as ActionDefinition;

export default snapshotTrigger({
  key: "new-knowledge-item",
  title: "New Knowledge Item",
  description:
    "The run gets each knowledge item (website, video, document or FAQ) newly added to the account, read as a whole through knowledge-list.",
  action,
  params: pickParams(action, []),
  sample: { id: "d38b8600-sample", type: "website", base_url: "https://example.com/" },
});
