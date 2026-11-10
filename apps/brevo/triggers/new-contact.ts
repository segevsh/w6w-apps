import { newContact } from "../lib/triggers.ts";

// The key is stated here so the trigger's name is readable from its own file.
export default { ...newContact, key: "new-contact" };
