import { assertEquals } from "@std/assert";
import keywordGet from "../../actions/keyword-get.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("keyword-get: calls GET /keywords/JOIN and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, keyword: "JOIN", doubleOptInEnabled: true } }]);
  const result = await keywordGet.execute({ "keyword": "JOIN" } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/keywords/JOIN`);
  assertEquals(calls[0].body, null);
  assertEquals(result, { "id": 1, "keyword": "JOIN", "doubleOptInEnabled": true });
});

Deno.test("keyword-get: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, keyword: "JOIN", doubleOptInEnabled: true } }]);
  await keywordGet.execute({ "keyword": "JOIN" } as never, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});
