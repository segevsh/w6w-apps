/** The connection every action test runs against. */
export const display = {
  service: "https://bsky.social",
  did: "did:plc:me",
  handle: "me.bsky.social",
};

export const ok = (body: unknown) => ({ status: 200, body });

/** An XRPC error, which is `{error, message}` rather than a status code alone. */
export const xrpc = (error: string, message: string, status = 400) => ({
  status,
  body: { error, message },
});

export const POST_URI = "at://did:plc:author/app.bsky.feed.post/3k2a";
export const MY_POST_URI = "at://did:plc:me/app.bsky.feed.post/3k2a";
