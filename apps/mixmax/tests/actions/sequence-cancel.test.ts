import { assertEquals } from "@std/assert";
import action from "../../actions/sequence-cancel.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("sequence-cancel: POST /sequences/s1/cancel", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const out = await action.execute!({ sequenceId: "s1", emails: "a@x.com, b@x.com" } as never, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.mixmax.com/v1/sequences/s1/cancel");
  assertEquals(JSON.parse(calls[0].body!), { emails: ["a@x.com", "b@x.com"] });
  assertEquals(out, { cancelled: true });
});
