import { newListEntry } from "../lib/triggers.ts";

// The key literal is repeated here so tooling that scans `triggers/*.ts` for keys sees it.
export default { ...newListEntry, key: "new-list-entry" };
