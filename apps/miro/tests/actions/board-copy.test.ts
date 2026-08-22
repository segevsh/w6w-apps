import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/board-copy.ts";

/** PUT on the collection, with the source as a query param — not POST /copy. */
Deno.test("board-copy: PUTs /v2/boards with copy_from as a query parameter", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "b2" } }], { display: {} });
  await action.execute!({ copyFrom: "b1", name: "Copy of Roadmap" }, ctx);
  assertEquals(calls[0].method, "PUT");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/boards");
  assertEquals(url.searchParams.get("copy_from"), "b1");
  assertEquals(JSON.parse(calls[0].body!), { name: "Copy of Roadmap" });
});

Deno.test("board-copy: a source board is required", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`copyFrom`");
  assertEquals(calls.length, 0);
});
