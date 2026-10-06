import { assertEquals } from "@std/assert";
import action from "../../actions/sequence-search.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("sequence-search: GET /sequences/search?recipients=a%40x.com&recipients=b%40x.com&sequenceId=s1", async () => {
  const { ctx, calls } = mockCtx([{ body: { total: 1, results: [{ email: "a@x.com" }] } }]);
  const out = await action.execute!(
    { recipients: "a@x.com,b@x.com", sequenceId: "s1" } as never,
    ctx,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.mixmax.com/v1/sequences/search?recipients=a%40x.com&recipients=b%40x.com&sequenceId=s1",
  );
  assertEquals(calls[0].body, null);
  assertEquals(out, { results: [{ email: "a@x.com" }], total: 1 });
});
