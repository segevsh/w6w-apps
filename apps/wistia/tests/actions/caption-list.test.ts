import { assert, assertEquals } from "@std/assert";
import captionList from "../../actions/caption-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("caption-list: calls GET /modern/medias/abc/captions with the version header", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ "id": 1, "cursor": "cur1" }, { "id": 2, "cursor": "cur2" }],
  }]);
  const out = await captionList.execute({ "mediaId": "abc" } as never, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).origin, "https://api.wistia.com");
  assertEquals(pathOf(calls[0].url), "/modern/medias/abc/captions");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["x-wistia-api-version"], "2026-09");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out.count, 2);
  assertEquals(out.nextCursor, "cur2");
  assertEquals((out.items as unknown[]).length, 2);
});

Deno.test("caption-list: surfaces a Wistia error with its code", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "unauthorized_scope", error: "Token lacks scope." },
  }]);
  let message = "";
  try {
    await captionList.execute({ "mediaId": "abc" } as never, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("Wistia 401 unauthorized_scope"), message);
  assert(message.includes("Token lacks scope."), message);
});
