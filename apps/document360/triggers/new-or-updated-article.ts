import type { TriggerDefinition } from "@w6w/types";
import { articleOutput, articleSample, articleSnapshot } from "../lib/triggers.ts";

/** Fires on articles added or changed in a workspace (any change to the list summary). */
const trigger: TriggerDefinition = articleSnapshot({
  key: "new-or-updated-article",
  title: "New or Updated Article",
  description: "The run gets each article added to the workspace or whose summary changed.",
  updated: true,
  output: [...articleOutput],
  sample: articleSample,
});

export default trigger;
