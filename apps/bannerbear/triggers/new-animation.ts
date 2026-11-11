import type { ActionDefinition } from "@w6w/types";
import animationList from "../actions/animation-list.ts";
import { newestFirst } from "../lib/triggers.ts";

export default newestFirst({
  key: "new-animation",
  title: "New Animation",
  description:
    "The run gets each newly requested animation render, polled newest-first through animation-list.",
  action: animationList as unknown as ActionDefinition,
  sample: { uid: "anim_001", status: "pending", created_at: "2026-11-09T10:00:00.000Z" },
});
