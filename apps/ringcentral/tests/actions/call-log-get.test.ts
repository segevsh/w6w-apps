import { assertEquals } from "@std/assert";
import callLogGet from "../../actions/call-log-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("call-log-get: builds the record path and forwards view", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "abc", type: "Voice" } }]);
  const out = await callLogGet.execute(
    { callRecordId: "abc", view: "Detailed" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(
    pathOf(calls[0].url),
    "/restapi/v1.0/account/~/extension/~/call-log/abc",
  );
  assertEquals(queryOf(calls[0].url).view, "Detailed");
  assertEquals(out.type, "Voice");
});
