import { newOrUpdatedRecordTrigger, RECORD_KINDS } from "../lib/polls.ts";

export default newOrUpdatedRecordTrigger({ key: "new-or-updated-deal", kind: RECORD_KINDS.deal });
