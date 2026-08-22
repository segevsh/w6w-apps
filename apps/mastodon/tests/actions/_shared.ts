/** The connection every action test runs against. */
export const display = {
  url: "https://mastodon.social",
  acct: "@alice@mastodon.social",
  maxCharacters: 500,
  maxMedia: 4,
};

export const ok = (body: unknown) => ({ status: 200, body });

/** A response with the Link header Mastodon pages with. */
export const paged = (body: unknown, maxId = "111", minId = "999") => ({
  status: 200,
  body,
  headers: {
    "content-type": "application/json",
    link: `<https://x?max_id=${maxId}>; rel="next", <https://x?min_id=${minId}>; rel="prev"`,
  },
});

export const STATUS = {
  id: "s1",
  uri: "https://mastodon.social/users/alice/statuses/s1",
  url: "https://mastodon.social/@alice/s1",
  content: "<p>hello <a href='#'>#tag</a></p>",
  account: { acct: "alice" },
  replies_count: 2,
  reblogs_count: 3,
  favourites_count: 4,
};
