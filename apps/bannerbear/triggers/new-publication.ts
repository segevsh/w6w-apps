import type { ActionDefinition } from "@w6w/types";
import publicationList from "../actions/publication-list.ts";
import { newestFirst } from "../lib/triggers.ts";

export default newestFirst({
  key: "new-publication",
  title: "New Publication",
  description:
    "The run gets each newly created publication, polled newest-first through publication-list.",
  action: publicationList as unknown as ActionDefinition,
  sample: { uid: "pub_001", created_at: "2026-11-09T10:00:00.000Z" },
});
