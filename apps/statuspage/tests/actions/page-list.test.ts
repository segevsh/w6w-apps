import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/page-list.ts";

const conn = { display: { pageId: "pg1" } };

/** The only call that needs no page id. */
Deno.test("page-list: reads the pages this key can reach", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "pg1", name: "Acme" }] }], conn);
  const out = await action.execute!({}, ctx) as { pages: unknown[] };
  assertEquals(out.pages.length, 1);
  assertEquals(new URL(calls[0].url).pathname, "/v1/pages");
  assertEquals((action.params ?? []).length, 0);
});

Deno.test("page-list: explains why a write 404s", () => {
  assert(/404/.test(action.description!), action.description);
});
