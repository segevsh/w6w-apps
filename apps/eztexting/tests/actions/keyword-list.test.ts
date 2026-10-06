import { assertEquals } from "@std/assert";
import keywordList from "../../actions/keyword-list.ts";
import { API_ROOT, mockCtx, page, queryOf } from "../_helpers.ts";

Deno.test("keyword-list: calls GET /keywords and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 1, keyword: "JOIN" }]) }]);
  const result = await keywordList.execute({} as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/keywords`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(result, {
    "content": [{ "id": 1, "keyword": "JOIN" }],
    "totalPages": 1,
    "totalElements": 1,
    "numberOfElements": 1,
  });
});

Deno.test("keyword-list: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 1, keyword: "JOIN" }]) }]);
  await keywordList.execute({} as never, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});
