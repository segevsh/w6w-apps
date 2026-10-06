import { assertEquals } from "@std/assert";
import action from "../../actions/sequence-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("sequence-list: GET /sequences?name=Sales&expand=stages", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [{ _id: "s1" }] } }]);
  const out = await action.execute!({ name: "Sales", expandStages: true } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.mixmax.com/v1/sequences?name=Sales&expand=stages");
  assertEquals(calls[0].body, null);
  assertEquals(out, { results: [{ _id: "s1" }] });
});
