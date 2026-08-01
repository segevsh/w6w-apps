import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-tables.ts";

Deno.test("list-tables: GETs /docs/{docId}/tables", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [{ id: "grid-1" }] } }]);
  const out = await action.execute({ docId: "doc-1", pageToken: "cur-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/apis/v1/docs/doc-1/tables");
  assertEquals(url.searchParams.get("pageToken"), "cur-1");
  assertEquals(out.items[0].id, "grid-1");
});
