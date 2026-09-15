import { assertEquals } from "@std/assert";
import statusGet from "../../actions/status-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("status-get - GETs /status/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status_id: 123, people_id: 456 } }]);
  const out = await statusGet.execute({ status_id: 123 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/status/123");
  assertEquals(out, { status_id: 123, people_id: 456 });
});
