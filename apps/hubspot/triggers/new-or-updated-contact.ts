import { newOrUpdatedRecordTrigger, RECORD_KINDS } from "../lib/polls.ts";

export default newOrUpdatedRecordTrigger({
  key: "new-or-updated-contact",
  kind: RECORD_KINDS.contact,
});
