import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/label-get-many.ts";

Deno.test("label-get-many: GETs /labels and returns the response", async () => {
  const body = [{ id: "l1", name: "urgent" }];
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/v2/labels");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});
