import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import websiteListCheckpoints from "../actions/website-list-checkpoints.ts";

/** `website.listCheckpoints`: "all of its checkpoints, newest first" (https://open.manus.ai/docs/v2/website.listCheckpoints). */
export default pollFromListAction({
  key: "new-website-checkpoint",
  title: "New Website Checkpoint",
  description: "The run gets each new checkpoint (saved version) of one website built by a task.",
  action: websiteListCheckpoints as unknown as ActionDefinition,
  params: [
    {
      key: "websiteId",
      label: "Website ID",
      type: "string",
      required: true,
      hint: "The website to watch, from website-status or website-publish.",
    },
  ],
  input: (params) => ({ websiteId: (params as { websiteId?: string }).websiteId }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { version_id?: unknown }).version_id ?? ""),
  output: [
    { key: "version_id", type: "string", label: "Checkpoint version ID" },
    { key: "message", type: "string", label: "Commit message" },
    { key: "status", type: "string", label: "Checkpoint status" },
    { key: "created_at", type: "number", label: "Created at (unix seconds)" },
  ],
  sample: {
    version_id: "version-1",
    message: "Add pricing page",
    status: "success",
    created_at: 1762765200,
  },
  maxPages: 1,
});
