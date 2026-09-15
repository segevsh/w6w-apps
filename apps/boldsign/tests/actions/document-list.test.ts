import { assertEquals } from "@std/assert";
import documentList from "../../actions/document-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("document-list: always sends Page (documented required), even the default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { result: [] } }]);
  await documentList.execute({ page: 1 }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/document/list");
  assertEquals(queryOf(calls[0]).get("Page"), "1");
});

Deno.test("document-list: forwards optional filters and omits unset ones", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { result: [] } }]);
  await documentList.execute({ page: 2, pageSize: 25, status: "Completed" }, ctx);
  const q = queryOf(calls[0]);
  assertEquals(q.get("Page"), "2");
  assertEquals(q.get("PageSize"), "25");
  assertEquals(q.get("Status"), "Completed");
  assertEquals(q.has("SearchKey"), false);
});

Deno.test("document-list: is a search action", () => {
  assertEquals(documentList.type, "search");
});
