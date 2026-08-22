import { detailAction } from "../lib/repos.ts";

/**
 * One Space's metadata.
 *
 * `runtime.stage` is the useful field: `RUNNING`, `SLEEPING`, `BUILDING`,
 * `RUNTIME_ERROR`. Free-tier Spaces sleep after a period of inactivity and wake
 * on the first request, which takes a while — so a Space that "does not work"
 * is often one that is merely asleep.
 */
export default detailAction({
  kind: "spaces",
  key: "space-get",
  title: "Get a Space",
  description:
    "One Space's configuration and runtime. `runtime.stage` says whether it is RUNNING or merely " +
    "SLEEPING — free-tier Spaces sleep when idle and wake slowly.",
});
