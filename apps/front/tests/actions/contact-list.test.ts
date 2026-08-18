import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-list.ts";

/** The only filter Front offers here is a time window, in Unix seconds. */
Deno.test("contact-list: the incremental window goes out as q[updated_after]", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { _results: [{ id: "cnt_1" }] } }]);
  await action.execute!({ updatedAfter: "2026-01-01T00:00:00Z" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("q[updated_after]"), "1767225600");
});

Deno.test("contact-list: no window asks for everything", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { _results: [] } }]);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("q[updated_after]"), null);
});
