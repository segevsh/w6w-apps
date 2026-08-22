import { searchAction } from "../lib/repos.ts";

/**
 * Search the Hub for Spaces.
 *
 * A Space is a running application, so it sorts by likes rather than downloads
 * — nobody downloads one — and `runtime.stage` on the detail call says whether
 * it is actually up. Most Spaces on the free tier sleep when idle.
 */
export default searchAction({
  kind: "spaces",
  key: "space-search",
  title: "Search Spaces",
  description:
    "Find Spaces — hosted applications. They sort by likes rather than downloads, because nobody " +
    "downloads a running app.",
});
