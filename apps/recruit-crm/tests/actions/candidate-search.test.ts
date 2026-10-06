import { assertEquals } from "@std/assert";
import action from "../../actions/candidate-search.ts";
import { mockCtx, paginator, pathOf, queryOf } from "../_helpers.ts";

Deno.test("candidate-search: maps camelCase filters onto the vendor's query names", async () => {
  const { ctx, calls } = mockCtx([{ body: paginator([{ slug: "7" }]) }]);
  const out = await action.execute(
    { firstName: "Ada", lastName: "Lovelace", email: "a@b.co" },
    ctx,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/candidates/search");
  assertEquals(queryOf(calls[0].url), {
    first_name: "Ada",
    last_name: "Lovelace",
    email: "a@b.co",
  });
  assertEquals((out as { count: number }).count, 1);
});

Deno.test("candidate-search: linkedin filter and an empty result", async () => {
  const { ctx, calls } = mockCtx([{ body: paginator([]) }]);
  const out = await action.execute({ linkedin: "https://linkedin.com/in/ada" }, ctx);
  assertEquals(queryOf(calls[0].url), { linkedin: "https://linkedin.com/in/ada" });
  assertEquals((out as { hasMore: boolean }).hasMore, false);
});
