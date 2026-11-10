import { newOrUpdatedRecordTrigger, RECORD_KINDS } from "../lib/polls.ts";

export default newOrUpdatedRecordTrigger({
  key: "new-or-updated-ticket",
  kind: RECORD_KINDS.ticket,
});
