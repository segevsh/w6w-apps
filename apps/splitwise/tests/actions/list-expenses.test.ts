import { assert, assertEquals } from "@std/assert";
import listExpenses from "../../actions/list-expenses.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const PAGE = { expenses: [{ id: 51023, description: "Brunch", cost: "25.0" }] };

Deno.test("list-expenses: sends only the filters that were set", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await listExpenses.execute({ friend_id: 15, limit: 20, offset: 0 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v3.0/get_expenses");
  assertEquals(queryOf(calls[0].url), { friend_id: "15", limit: "20", offset: "0" });
});

/** `group_id: 0` selects expenses in NO group — dropping it as falsy loses the case. */
Deno.test("list-expenses: group_id 0 survives to the query", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await listExpenses.execute({ group_id: 0 }, ctx);
  assertEquals(queryOf(calls[0].url), { group_id: "0" });
});

/**
 * "If provided, only expenses in that group will be returned, and `friend_id`
 * will be ignored." There is no error for supplying both — the friend filter
 * just evaporates, and the result looks like a complete answer.
 */
Deno.test("list-expenses: warns when group_id silently overrides friend_id", async () => {
  const { ctx, logs } = mockCtx([{ body: PAGE }]);
  await listExpenses.execute({ group_id: 321, friend_id: 15 }, ctx);

  const warning = logs.find((l) => l.level === "warn");
  assert(warning, "no warning for the silently-ignored friend filter");
  assert(/ignores friend_id/.test(warning.message), warning.message);
});

Deno.test("list-expenses: group_id 0 with a friend_id still warns", async () => {
  const { ctx, logs } = mockCtx([{ body: PAGE }]);
  await listExpenses.execute({ group_id: 0, friend_id: 15 }, ctx);
  assert(logs.some((l) => l.level === "warn"), "group 0 is still a group filter");
});

Deno.test("list-expenses: a friend filter alone does not warn", async () => {
  const { ctx, logs } = mockCtx([{ body: PAGE }]);
  await listExpenses.execute({ friend_id: 15 }, ctx);
  assertEquals(logs.filter((l) => l.level === "warn").length, 0);
});

Deno.test("list-expenses: all four date filters are passed through", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await listExpenses.execute({
    dated_after: "2026-01-01T00:00:00Z",
    dated_before: "2026-02-01T00:00:00Z",
    updated_after: "2026-01-15T00:00:00Z",
    updated_before: "2026-02-15T00:00:00Z",
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    dated_after: "2026-01-01T00:00:00Z",
    dated_before: "2026-02-01T00:00:00Z",
    updated_after: "2026-01-15T00:00:00Z",
    updated_before: "2026-02-15T00:00:00Z",
  });
});

Deno.test("list-expenses: prefills the vendor's own default limit of 20", () => {
  assertEquals(listExpenses.params?.find((p) => p.key === "limit")?.default, 20);
  assertEquals(listExpenses.type, "search");
});
