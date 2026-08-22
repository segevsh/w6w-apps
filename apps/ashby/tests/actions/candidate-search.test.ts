import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/candidate-search.ts";

const ok = (results: unknown) => ({ status: 200, body: { success: true, results } });

Deno.test("candidate-search: posts the email and reports whether anything matched", async () => {
  const { ctx, calls } = mockCtx([ok([{ id: "c1" }])]);
  const result = await action.execute!({ email: "ada@example.com" }, ctx) as {
    found: boolean;
    count: number;
  };
  assertEquals(calls[0].url, "https://api.ashbyhq.com/candidate.search");
  assertEquals(JSON.parse(calls[0].body!), { email: "ada@example.com", limit: 100 });
  assertEquals(result.found, true);
  assertEquals(result.count, 1);
});

Deno.test("candidate-search: no match is a clean false, not an error", async () => {
  const { ctx } = mockCtx([ok([])]);
  const result = await action.execute!({ name: "Ada Lovelace" }, ctx) as { found: boolean };
  assertEquals(result.found, false);
});

Deno.test("candidate-search: needs something to match on", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "email");
  assertEquals(calls.length, 0);
});

/** Many of these people have not told their employer they are looking. */
Deno.test("candidate-search: logs a count, never the people", async () => {
  const { ctx, logs } = mockCtx([ok([{ id: "c1", name: "Ada", email: "ada@example.com" }])]);
  await action.execute!({ email: "ada@example.com" }, ctx);
  assert(!JSON.stringify(logs).includes("ada@example.com"), JSON.stringify(logs));
  assertEquals(logs[0].data, { count: 1 });
});

/** `.search` is unpaginated and for lookups; `.list` walks the organisation. */
Deno.test("candidate-search: is declared a search action and says why to use it", () => {
  assertEquals(action.type, "search");
  assert(/yes\/no/.test(action.description!), action.description);
});
