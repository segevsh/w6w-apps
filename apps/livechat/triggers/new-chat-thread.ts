import type { TriggerDefinition } from "@w6w/types";
import { newChatThreadTrigger } from "../lib/triggers.ts";

/** The definition lives in `lib/triggers.ts`; the key is repeated here so the file names its trigger. */
const trigger: TriggerDefinition = { ...newChatThreadTrigger, key: "new-chat-thread" };

export default trigger;
