import { newOrUpdatedRecordTrigger, RECORD_KINDS } from "../lib/polls.ts";

export default newOrUpdatedRecordTrigger({
  key: "new-or-updated-company",
  kind: RECORD_KINDS.company,
});
