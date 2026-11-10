import type { TriggerDefinition } from "@w6w/types";
import { type NewEmailParams, newEmailTrigger } from "../lib/triggers.ts";

// The definition lives in lib/triggers.ts (the since-filter check is shared with the tests); the
// key is stated here too so the trigger file is self-describing.
const newEmail: TriggerDefinition<NewEmailParams> = { ...newEmailTrigger, key: "new-email" };

export default newEmail;
