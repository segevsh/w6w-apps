import { assertEquals } from "@std/assert";
import getTrendingGifs from "../../actions/get-trending-gifs.ts";
import { envelope, gif, mockCtx, PAGINATION_FIXTURE, pathOf, queryOf } from "../_helpers.ts";

Deno.test("get-trending-gifs: calls GET /v1/gifs/trending with no required params", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope([gif()], { pagination: PAGINATION_FIXTURE }) },
  ]);
  const out = await getTrendingGifs.execute({}, ctx) as {
    data: Array<{ url: string }>;
    pagination: unknown;
  };

  assertEquals(pathOf(calls[0].url), "/v1/gifs/trending");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out.data[0].url, "https://giphy.com/gifs/abc123");
  assertEquals(out.pagination, PAGINATION_FIXTURE);
});

Deno.test("get-trending-gifs: limit, offset and rating are forwarded when set", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await getTrendingGifs.execute({ limit: 3, offset: 6, rating: "g" }, ctx);
  assertEquals(queryOf(calls[0].url), { limit: "3", offset: "6", rating: "g" });
});

Deno.test("get-trending-gifs: no param is required, so a bare call is valid", () => {
  assertEquals(getTrendingGifs.type, "read");
  for (const p of getTrendingGifs.params ?? []) assertEquals(p.required, undefined, p.key);
  // limit is left unset: this endpoint's documented default is not stated, so
  // the vendor's own default applies rather than a guessed number.
  assertEquals(getTrendingGifs.params?.find((p) => p.key === "limit")?.default, undefined);
});
