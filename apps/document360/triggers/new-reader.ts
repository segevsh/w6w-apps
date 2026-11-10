import type { ActionDefinition } from "@w6w/types";
import readerList from "../actions/reader-list.ts";
import { boundedListSnapshot } from "../lib/triggers.ts";

export default boundedListSnapshot({
  key: "new-reader",
  title: "New Reader",
  description: "The run gets each new private-knowledge-base reader.",
  action: readerList as unknown as ActionDefinition,
  params: readerList.params,
  input: (params) => params,
  output: [{ key: "id", type: "string", label: "Reader ID" }],
  sample: { id: "reader-101", email: "reader@example.test" },
});
