import type { ActionDefinition } from "@w6w/types";
import boardsList from "../actions/boards-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** `GET /v3/enterprise/tags` returns the team's boards in one response (no paging in the
 * reference); a team has a handful, so each check diffs the ids.
 * https://developers.feedly.com/llms.txt (Boards: "Get list of team board streamIds") */
export default snapshotTrigger({
  key: "new-board",
  title: "New Board",
  description: "The run gets each board newly created in the Feedly team.",
  action: boardsList as unknown as ActionDefinition,
  input: () => ({}),
  items: (result) => (result as { boards?: unknown[] }).boards ?? [],
  keyOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Board stream ID" },
    { key: "label", type: "string", label: "Name" },
  ],
  sample: { id: "enterprise/acme/tag/b1", label: "Priority intel" },
});
