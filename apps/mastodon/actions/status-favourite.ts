import { interaction } from "../lib/interactions.ts";

/** Favourite a status. See `lib/interactions.ts` for why there is no record id. */
export default interaction({
  key: "status-favourite",
  path: "favourite",
  flag: "favourited",
  countField: "favourites_count",
  verb: "favourite",
  undo: false,
  title: "Favourite a status",
  description:
    "Favourite a post. Unlike a record-based network there is no separate object to keep — " +
    "undoing it takes the same status id.",
});
