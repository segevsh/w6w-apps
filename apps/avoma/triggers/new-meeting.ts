import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/meeting-list.ts";

const DAY_MS = 86_400_000;
/** Rolling window, computed at poll time: meetings that started in the last 7 days or start in the next 14. */
const BACK_DAYS = 7;
const AHEAD_DAYS = 14;
const KEEP = new Set(["attendeeEmails", "isCall", "isInternal"]);

const trigger = pollFromListAction({
  key: "new-meeting",
  title: "New Meeting",
  description:
    "The run gets each new Avoma meeting inside a rolling window (7 days back, 14 days ahead).",
  action: action as unknown as ActionDefinition,
  input: (params) => {
    const now = Date.now();
    return {
      ...params,
      fromDate: new Date(now - BACK_DAYS * DAY_MS).toISOString(),
      toDate: new Date(now + AHEAD_DAYS * DAY_MS).toISOString(),
      order: "-start_at",
      pageSize: 100,
    };
  },
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { uuid?: string }).uuid),
  params: (action.params ?? []).filter((p) => KEEP.has(p.key)),
  output: [
    { key: "uuid", type: "string", label: "Meeting ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "start_at", type: "string", label: "Start time" },
    { key: "end_at", type: "string", label: "End time" },
    { key: "is_call", type: "boolean", label: "Voice call" },
  ],
  sample: {
    uuid: "9b2f0c1e-0000-4000-8000-000000000001",
    subject: "Acme discovery call",
    start_at: "2026-11-09T15:00:00Z",
    end_at: "2026-11-09T15:30:00Z",
    is_call: false,
  },
  maxPages: 1,
});

export default trigger;
