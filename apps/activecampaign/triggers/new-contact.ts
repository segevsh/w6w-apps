import { newContact } from "../lib/triggers.ts";

// The key is spelled out here so the trigger set is readable from this directory alone.
export default { ...newContact, key: "new-contact" };
