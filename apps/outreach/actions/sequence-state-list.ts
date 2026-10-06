import { listAction } from "../lib/factory.ts";
export default listAction({
  key: "sequence-state-list",
  title: "List Sequence States",
  noun: "Sequence State",
  type: "sequenceState",
  path: "sequenceStates",
  description:
    'List sequence states — one per prospect enrolled in a sequence. Filter with `{"prospect": {"id": "1"}}` or `{"sequence": {"id": "2"}}` to see who is in what, and read `state` (active, pending, finished, paused, disabled, failed, bounced, opted_out).',
});
