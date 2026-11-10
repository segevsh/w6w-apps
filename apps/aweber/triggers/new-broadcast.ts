import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import broadcastList from "../actions/broadcast-list.ts";
import { pollSentBroadcasts } from "../lib/triggers.ts";

/**
 * Wraps `broadcast-list` with `status=sent` for the list the user picks. The reference says sent
 * broadcasts are "sorted by `sent_at`" but states no direction, so the trigger reads up to five pages
 * of 100 and emits only additions (https://api.aweber.com/, verified 2026-11-10).
 */
const trigger: TriggerDefinition = {
  key: "new-broadcast",
  title: "New Sent Broadcast",
  description: "The run gets each broadcast newly sent from the selected AWeber list.",
  params: (broadcastList.params ?? []).filter((p) => p.key === "accountId" || p.key === "listId"),
  output: [
    { key: "change", type: "string", label: "Change (added)" },
    { key: "key", type: "string", label: "Broadcast ID" },
    { key: "values", type: "object", label: "Broadcast (broadcast_id, subject, sent_at)" },
  ],
  sample: {
    change: "added",
    key: "5001",
    values: {
      broadcast_id: 5001,
      subject: "November news",
      status: "sent",
      sent_at: "2026-11-09T09:00:00-05:00",
    },
  },
  minIntervalMs: 900_000,
  poll({ params, state }, ctx) {
    return pollSentBroadcasts(
      state,
      (params ?? {}) as Record<string, unknown>,
      ctx,
      broadcastList as unknown as ActionDefinition,
    );
  },
};

export default trigger;
