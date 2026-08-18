import { interaction } from "../lib/interactions.ts";

/** Remove a favourite, by the same status id. */
export default interaction({
  key: "status-unfavourite",
  path: "unfavourite",
  flag: "favourited",
  countField: "favourites_count",
  verb: "favourite",
  undo: true,
  title: "Remove a favourite",
  description:
    "Un-favourite a post, using the same status id. `changed` says whether there was anything " +
    "to remove.",
});
