import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import action from "../../actions/unsubscribe-list.ts";
import { mockCtx } from "../_helpers.ts";

test("unsubscribe-list: GET /unsubscribes?sort=email&sortAscending=true", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [{ email: "a@x.com" }], next: "n" } }]);
  const out = await action.execute!({ sort: "email", sortAscending: true } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.mixmax.com/v1/unsubscribes?sort=email&sortAscending=true",
  );
  assertEquals(calls[0].body, null);
  assertEquals(out, { results: [{ email: "a@x.com" }], next: "n", hasNext: false });
});
