import { interaction } from "../lib/interactions.ts";

/** Undo a boost, by the same status id. */
export default interaction({
  key: "status-unboost",
  path: "unreblog",
  flag: "reblogged",
  countField: "reblogs_count",
  verb: "boost",
  undo: true,
  title: "Remove a boost",
  description:
    "Undo a boost, using the same status id. Followers who already saw it are not notified.",
});
