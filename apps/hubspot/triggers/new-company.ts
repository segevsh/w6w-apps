import { newRecordTrigger, RECORD_KINDS } from "../lib/polls.ts";

export default newRecordTrigger({ key: "new-company", kind: RECORD_KINDS.company });
