import { assertEquals } from "@std/assert";
import callGet from "../../actions/call-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("call-get: fetches a single call by id and forwards fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "CAL1", answered: true } }]);
  const out = await callGet.execute(
    { accountId: "ACC1", callId: "CAL1", fields: "milestones" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v3/a/ACC1/calls/CAL1.json");
  assertEquals(queryOf(calls[0].url).fields, "milestones");
  assertEquals(out, { id: "CAL1", answered: true });
});
