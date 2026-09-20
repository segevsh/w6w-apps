import { assert, assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import executeAction from "../../actions/execute.ts";
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

Deno.test("execute: sends exactly the caller's SQL bytes, unmodified, as a Simple Query", async () => {
  const sql = "UPDATE users SET name = 'bob' WHERE id = 1; -- not a $1 in sight";
  const { ctx, mock } = mockCtx([
    concatBytes(commandComplete("UPDATE 1"), readyForQuery()),
  ]);

  await executeAction.execute({ sql }, ctx);

  assertEquals(mock.writes.length, 1);
  assertEquals(mock.writes[0], encodeQuery(sql));
});

Deno.test("execute: returns rowCount + command from CommandComplete, never a row set", async () => {
  const { ctx } = mockCtx([
    concatBytes(commandComplete("INSERT 0 2"), readyForQuery()),
  ]);
  const result = await executeAction.execute({ sql: "INSERT INTO t VALUES (1), (2)" }, ctx);
  assertEquals(result, { rowCount: 2, command: "INSERT 0 2" });
  assert(!("rows" in result), "execute's Output must not carry a row set");
});

Deno.test("execute: a command tag with no trailing integer (CREATE TABLE) reports rowCount 0", async () => {
  const { ctx } = mockCtx([
    concatBytes(commandComplete("CREATE TABLE"), readyForQuery()),
  ]);
  const result = await executeAction.execute({ sql: "CREATE TEMP TABLE t (v int)" }, ctx);
  assertEquals(result, { rowCount: 0, command: "CREATE TABLE" });
});

Deno.test("execute: a multi-statement sql keeps only the LAST CommandComplete's tag/count", async () => {
  const { ctx } = mockCtx([
    concatBytes(
      commandComplete("CREATE TABLE"),
      commandComplete("INSERT 0 2"),
      rowDescription(["v"]),
      dataRow(["1"]),
      dataRow(["2"]),
      commandComplete("SELECT 2"),
      readyForQuery(),
    ),
  ]);
  const result = await executeAction.execute({
    sql: "CREATE TEMP TABLE t (v int); INSERT INTO t VALUES (1),(2); SELECT v FROM t;",
  }, ctx);
  assertEquals(result, { rowCount: 2, command: "SELECT 2" });
});

Deno.test("execute: reassembles a reply that arrives byte-at-a-time across many socket.read() calls", async () => {
  const whole = concatBytes(commandComplete("DELETE 3"), readyForQuery());
  const { ctx } = mockCtx(chunk(whole, 3));
  const result = await executeAction.execute({ sql: "DELETE FROM t" }, ctx);
  assertEquals(result, { rowCount: 3, command: "DELETE 3" });
});

Deno.test("execute: a server ErrorResponse rejects with its M field", async () => {
  const { ctx } = mockCtx([
    errorResponse({ S: "ERROR", C: "42P01", M: 'relation "nope" does not exist' }),
  ]);
  await assertExecuteRejects(ctx, "DELETE FROM nope", 'relation "nope" does not exist');
});

Deno.test("execute: throws if the connection closes before ReadyForQuery arrives", async () => {
  const { ctx } = mockCtx([commandComplete("DELETE 0")]);
  await assertExecuteRejects(ctx, "DELETE FROM t", "connection closed");
});

Deno.test("execute: throws a clear error when ctx.socket is unavailable", async () => {
  const ctx: HookContext = { fetch: (() => {}) as unknown as typeof fetch, log: () => {} };
  await assertExecuteRejects(ctx, "DELETE FROM t", "ctx.socket is unavailable");
});

Deno.test("execute: declares perform/idempotent:false, never claims arbitrary SQL is safe to retry", () => {
  assertEquals(executeAction.type, "perform");
  assertEquals(executeAction.idempotent, false);
});

async function assertExecuteRejects(ctx: HookContext, sql: string, messageIncludes: string) {
  let threw = false;
  try {
    await executeAction.execute({ sql }, ctx);
  } catch (err) {
    threw = true;
    assert(String((err as Error).message).includes(messageIncludes), String(err));
  }
  assert(threw, "expected execute.execute to reject");
}
