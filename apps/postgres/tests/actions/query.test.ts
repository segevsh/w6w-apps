import { assert, assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import query from "../../actions/query.ts";
import { encodeQuery } from "../../lib/wire.ts";
import {
  chunk,
  commandComplete,
  concatBytes,
  dataRow,
  errorResponse,
  mockCtx,
  readyForQuery,
  rowDescription,
} from "../_helpers.ts";

/** (k) — the action wires `lib/` to `ctx.socket`, and pinned mechanism 1: the caller's SQL, byte-for-byte. */
Deno.test("query: sends exactly the caller's SQL bytes, unmodified, as a Simple Query", async () => {
  const sql = "SELECT id, name FROM users WHERE id = 1; -- not a $1 in sight";
  const { ctx, mock } = mockCtx([
    concatBytes(
      rowDescription(["id", "name"]),
      dataRow(["1", "alice"]),
      commandComplete("SELECT 1"),
      readyForQuery(),
    ),
  ]);

  await query.execute({ sql }, ctx);

  assertEquals(mock.writes.length, 1);
  assertEquals(
    mock.writes[0],
    encodeQuery(sql),
    "the exact bytes lib/wire.ts would encode for this SQL",
  );
});

Deno.test("query: parses rows into { column: value } records, using RowDescription's field names", async () => {
  const { ctx } = mockCtx([
    concatBytes(
      rowDescription(["id", "name"]),
      dataRow(["1", "alice"]),
      dataRow(["2", null]),
      commandComplete("SELECT 2"),
      readyForQuery(),
    ),
  ]);
  const result = await query.execute({ sql: "SELECT id, name FROM users" }, ctx);
  assertEquals(result.rows, [{ id: "1", name: "alice" }, { id: "2", name: null }]);
  assertEquals(result.rowCount, 2);
  assertEquals(result.command, "SELECT 2");
});

/** Frame reassembly at the action's own read loop, not just `lib/wire.ts` in isolation. */
Deno.test("query: reassembles a reply that arrives byte-at-a-time across many socket.read() calls", async () => {
  const whole = concatBytes(
    rowDescription(["n"]),
    dataRow(["42"]),
    commandComplete("SELECT 1"),
    readyForQuery(),
  );
  const { ctx } = mockCtx(chunk(whole, 3));
  const result = await query.execute({ sql: "SELECT 42 AS n" }, ctx);
  assertEquals(result.rows, [{ n: "42" }]);
});

Deno.test("query: a server ErrorResponse rejects with its M field", async () => {
  const { ctx } = mockCtx([
    errorResponse({ S: "ERROR", C: "42601", M: 'syntax error at or near "SELCT"' }),
  ]);
  await assertQueryRejects(ctx, "SELCT 1", 'syntax error at or near "SELCT"');
});

Deno.test("query: throws if the connection closes before ReadyForQuery arrives", async () => {
  const { ctx } = mockCtx([commandComplete("SELECT 0")]); // no ReadyForQuery, then EOF
  await assertQueryRejects(ctx, "SELECT 1", "connection closed");
});

Deno.test("query: throws a clear error when ctx.socket is unavailable", async () => {
  const ctx: HookContext = { fetch: (() => {}) as unknown as typeof fetch, log: () => {} };
  await assertQueryRejects(ctx, "SELECT 1", "ctx.socket is unavailable");
});

async function assertQueryRejects(ctx: HookContext, sql: string, messageIncludes: string) {
  let threw = false;
  try {
    await query.execute({ sql }, ctx);
  } catch (err) {
    threw = true;
    assert(String((err as Error).message).includes(messageIncludes), String(err));
  }
  assert(threw, "expected query.execute to reject");
}
