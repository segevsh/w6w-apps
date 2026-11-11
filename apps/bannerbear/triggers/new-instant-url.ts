import type { ActionDefinition } from "@w6w/types";
import instantUrlList from "../actions/instant-url-list.ts";
import { newestFirst } from "../lib/triggers.ts";

export default newestFirst({
  key: "new-instant-url",
  title: "New Instant URL",
  description:
    "The run gets each newly created Instant URL, polled newest-first through instant-url-list.",
  action: instantUrlList as unknown as ActionDefinition,
  sample: { uid: "iu_001", status: "active", created_at: "2026-11-09T10:00:00.000Z" },
});
