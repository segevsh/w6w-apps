import { updatedTrigger } from "../lib/party-triggers.ts";

// The key is spelled here so the trigger is greppable by its file (the definition lives in lib/).
export default { ...updatedTrigger, key: "new-or-updated-party" };
