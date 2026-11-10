import { newRecordTrigger, RECORD_KINDS } from "../lib/polls.ts";

export default newRecordTrigger({ key: "new-deal", kind: RECORD_KINDS.deal });
