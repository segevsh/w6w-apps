import type { ActionDefinition } from "@w6w/types";
import coursesList from "../actions/courses-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

export default snapshotTrigger({
  key: "new-course",
  title: "New Course",
  description:
    "The run gets each course (multi-session programme) newly created, read as a whole through courses-list.",
  action: coursesList as unknown as ActionDefinition,
  sample: { id: 78, name: "Beginner Pilates" },
});
