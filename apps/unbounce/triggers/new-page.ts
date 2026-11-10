import pageList from "../actions/page-list.ts";
import type { ActionDefinition } from "@w6w/types";
import { newRecordTrigger } from "../lib/triggers.ts";

export default newRecordTrigger<Record<string, never>>({
  key: "new-page",
  title: "New Page",
  description:
    "The run gets each new landing page, pop-up or sticky bar visible to the connection.",
  action: pageList as unknown as ActionDefinition,
  input: () => ({ sortOrder: "desc", limit: 100 }),
  listKey: "pages",
  params: [],
  idLabel: "Page ID",
});
