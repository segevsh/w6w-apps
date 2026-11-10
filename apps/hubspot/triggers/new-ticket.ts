import { newRecordTrigger, RECORD_KINDS } from "../lib/polls.ts";

export default newRecordTrigger({ key: "new-ticket", kind: RECORD_KINDS.ticket });
