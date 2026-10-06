import { assertEquals } from "@std/assert";
import mediaList from "../../actions/media-list.ts";
import { API_ROOT, mockCtx, page, queryOf } from "../_helpers.ts";

Deno.test("media-list: calls GET /media-files and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "5", url: "https://x/y.png" }]) }]);
  const result = await mediaList.execute({ "size": "10" } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/media-files`);
  assertEquals(queryOf(calls[0].url), { "size": "10" });
  assertEquals(calls[0].body, null);
  assertEquals(result, {
    "content": [{ "id": "5", "url": "https://x/y.png" }],
    "totalPages": 1,
    "totalElements": 1,
    "numberOfElements": 1,
  });
});

Deno.test("media-list: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "5", url: "https://x/y.png" }]) }]);
  await mediaList.execute({ "size": "10" } as never, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});
