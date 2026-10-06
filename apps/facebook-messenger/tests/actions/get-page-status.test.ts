import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-page-status.ts";

Deno.test("get-page-status: GET /{page}/page_status", async () => {
  const body = { id: "1", timestamp: 1, status: "ok" };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(await action.execute!({}, ctx), body);
  assertEquals(new URL(calls[0].url).pathname, "/v26.0/me/page_status");
});

Deno.test("get-page-status: explicit page id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ pageId: "42" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v26.0/42/page_status");
});
