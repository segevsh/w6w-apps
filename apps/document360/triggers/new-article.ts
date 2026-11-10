import type { TriggerDefinition } from "@w6w/types";
import { articleOutput, articleSample, articleSnapshot } from "../lib/triggers.ts";

/** Fires on articles added to a workspace (`workspace-article-list`, watched as a snapshot). */
const trigger: TriggerDefinition = articleSnapshot({
  key: "new-article",
  title: "New Article",
  description: "The run gets each article newly added to the workspace.",
  updated: false,
  output: [...articleOutput],
  sample: articleSample,
});

export default trigger;
