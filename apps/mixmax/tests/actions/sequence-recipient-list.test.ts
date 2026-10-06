import { assertEquals } from "@std/assert";
import action from "../../actions/sequence-recipient-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("sequence-recipient-list: GET /sequences/s1/recipients?limit=50&offset=50", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ email: "a@x.com" }] }]);
  const out = await action.execute!({ sequenceId: "s1", limit: 50, offset: 50 } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.mixmax.com/v1/sequences/s1/recipients?limit=50&offset=50",
  );
  assertEquals(calls[0].body, null);
  assertEquals(out, { recipients: [{ email: "a@x.com" }], count: 1 });
});
