import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/template-list.ts";

Deno.test("template-list: pages the templates collection", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { list_info: { num_pages: 1 }, templates: [{ template_id: "t1" }] },
  }]);
  assertEquals(await action.execute!({}, ctx), [{ template_id: "t1" }]);
  assertEquals(new URL(calls[0].url).pathname, "/v3/template/list");
});

Deno.test("template-list: the account id and query reach the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { list_info: {}, templates: [] } }]);
  await action.execute!({ accountId: "all", query: "title:NDA" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("account_id"), "all");
  assertEquals(q.get("query"), "title:NDA");
});
