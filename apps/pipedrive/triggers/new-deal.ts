import { newDeal } from "../lib/triggers.ts";

// The key is spelled out so tools that read `triggers/` for `key:` (the coverage report) see it.
export default { ...newDeal, key: "new-deal" } satisfies typeof newDeal;
