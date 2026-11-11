import type { ActionDefinition } from "@w6w/types";
import animationTemplateList from "../actions/animation-template-list.ts";
import { newestFirst } from "../lib/triggers.ts";

export default newestFirst({
  key: "new-animation-template",
  title: "New Animation Template",
  description:
    "The run gets each newly created animation template, polled newest-first through animation-template-list.",
  action: animationTemplateList as unknown as ActionDefinition,
  sample: { uid: "atmpl_001", name: "Intro", created_at: "2026-11-09T10:00:00.000Z" },
});
