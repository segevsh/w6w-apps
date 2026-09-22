import { assertEquals } from "@std/assert";
import getGifById from "../../actions/get-gif-by-id.ts";
import { envelope, gif, giphyError, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("get-gif-by-id: calls GET /v1/gifs/{id} and returns the GIF with meta", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(gif()) }]);
  const out = await getGifById.execute({ gifId: "abc123" }, ctx) as {
    data: { id: string };
    meta: { status: number };
  };

  assertEquals(pathOf(calls[0].url), "/v1/gifs/abc123");
  assertEquals(out.data.id, "abc123");
  assertEquals(out.meta.status, 200);
});

Deno.test("get-gif-by-id: rating is forwarded, and the id is path-escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(gif()) }]);
  await getGifById.execute({ gifId: "a/b?c", rating: "r" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/gifs/a%2Fb%3Fc");
  assertEquals(queryOf(calls[0].url), { rating: "r" });
});

/**
 * The documented 404: an unknown id answers a 4xx `meta.status` with an empty
 * `data`. That is an answer to "does this id exist?", so it must resolve rather
 * than throw.
 */
Deno.test("get-gif-by-id: an unknown id resolves with GIPHY's own status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: giphyError(404, "Not Found") }]);
  const out = await getGifById.execute({ gifId: "nope" }, ctx) as {
    data: unknown;
    meta: { status: number; msg: string };
  };

  assertEquals(out.data, []);
  assertEquals(out.meta.status, 404);
  assertEquals(out.meta.msg, "Not Found");
});

/** Only 404 is an answer here — every other non-200 code is still a failure. */
Deno.test("get-gif-by-id: a 401 still throws rather than looking like a missing id", async () => {
  const { ctx } = mockCtx([{ status: 401, body: giphyError(401, "Unauthorized") }]);
  let threw = false;
  try {
    await getGifById.execute({ gifId: "abc123" }, ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test("get-gif-by-id: the id is required", () => {
  assertEquals(getGifById.params?.find((p) => p.key === "gifId")?.required, true);
});
