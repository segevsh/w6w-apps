import { newTrigger } from "../lib/party-triggers.ts";

// The key is spelled here so the trigger is greppable by its file (the definition lives in lib/).
export default { ...newTrigger, key: "new-party" };
