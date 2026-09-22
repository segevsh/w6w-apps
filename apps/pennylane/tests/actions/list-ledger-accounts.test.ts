import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-ledger-accounts.ts";

const PAGE = {
  items: [{ id: 1, number: "411000", label: "Customers" }],
  has_more: false,
  next_cursor: null,
};

Deno.test("list-ledger-accounts: GETs /ledger_accounts", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const res = await action.execute({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/api/external/v2/ledger_accounts");
  assertEquals(res, PAGE);
});

Deno.test("list-ledger-accounts: a limit above the usual 100 is sent through, not clamped", async () => {
  // This is the one list whose documented ceiling is 1,000.
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await action.execute({ limit: 1000 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "1000");
});

Deno.test("list-ledger-accounts: filters on a number prefix and on enabled", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await action.execute({
    filter: [
      { field: "number", operator: "start_with", value: "411" },
      { field: "enabled", operator: "eq", value: true },
    ],
  }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("filter"),
    '[{"field":"number","operator":"start_with","value":"411"},{"field":"enabled","operator":"eq","value":true}]',
  );
});
