import { interaction } from "../lib/interactions.ts";

/**
 * Boost — Mastodon's repost. It carries no comment: quoting does not exist in
 * mainline Mastodon, and a "quote" elsewhere in the fediverse is a link in a
 * new post rather than a first-class embed.
 */
export default interaction({
  key: "status-boost",
  path: "reblog",
  flag: "reblogged",
  countField: "reblogs_count",
  verb: "boost",
  undo: false,
  title: "Boost a status",
  description:
    "Boost a post to your followers. Mastodon has no quote-boost — adding a comment means a new " +
    "post linking to it.",
});
