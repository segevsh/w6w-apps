import { detailAction } from "../lib/repos.ts";

/**
 * One dataset's metadata.
 *
 * `cardData` carries the licence, which is the field to read before using a
 * dataset for anything — the Hub hosts everything from CC0 to research-only,
 * and nothing enforces it at download time.
 */
export default detailAction({
  kind: "datasets",
  key: "dataset-get",
  title: "Get a dataset",
  description:
    "One dataset's card and configuration. `cardData.license` is the field worth reading first — " +
    "nothing enforces it at download time.",
});
