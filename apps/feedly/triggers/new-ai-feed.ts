import type { ActionDefinition } from "@w6w/types";
import aiFeedsList from "../actions/ai-feeds-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** `GET /v3/alerts` returns the team's AI Feeds (`enterpriseAlerts`) in one response; each check
 * diffs their `feedId`. The caller's private `userAlerts` are not the team's and are left out.
 * https://developers.feedly.com/llms.txt (Get list of AI Feeds) */
export default snapshotTrigger({
  key: "new-ai-feed",
  title: "New AI Feed",
  description: "The run gets each AI Feed newly created for the Feedly team.",
  action: aiFeedsList as unknown as ActionDefinition,
  input: () => ({}),
  items: (result) => (result as { enterpriseAlerts?: unknown[] }).enterpriseAlerts ?? [],
  keyOf: (item) => {
    const a = item as { feedId?: unknown; id?: unknown };
    return String(a.feedId ?? a.id ?? "");
  },
  output: [
    { key: "feedId", type: "string", label: "AI Feed stream ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { feedId: "feed/https://feedly.com/f/alert/sample-uuid", name: "Ransomware" },
});
