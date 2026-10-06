import { assertEquals, assertRejects } from "@std/assert";
import action, { SUPPRESSION_LISTS } from "../../actions/list-suppressions.ts";
import { exec, mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-suppressions: routes each list to its own path", async () => {
  for (const { value } of SUPPRESSION_LISTS) {
    const { ctx, calls } = mockCtx([{ body: page([]) }]);
    await exec(action, { type: value }, ctx);
    assertEquals(pathOf(calls[0].url), `/v1/suppressions/${value}`);
  }
  assertEquals(SUPPRESSION_LISTS.map((l) => l.value), [
    "blocklist",
    "hard-bounces",
    "spam-complaints",
    "unsubscribes",
    "on-hold-list",
  ]);
});

Deno.test("list-suppressions: forwards domain_id, page and limit and returns the page", async () => {
  const body = page([{ id: "s1", type: "exact", pattern: "a@x.com" }]);
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await exec(action, { type: "blocklist", domainId: "d1", page: 2, limit: 10 }, ctx);
  assertEquals(queryOf(calls[0].url), { domain_id: "d1", page: "2", limit: "10" });
  assertEquals(out, body);
});

Deno.test("list-suppressions: an unknown list is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => exec(action, { type: "../token" }, ctx),
    Error,
    "unknown suppression list",
  );
  assertEquals(calls.length, 0);
});
