import type { ActionDefinition } from "@w6w/types";
import { encodeQuery, FrameReader, parseCommandComplete, parseErrorResponse } from "../lib/wire.ts";

interface Input {
  sql: string;
}

interface Output {
  rowCount: number;
  command: string;
}

/**
 * Run SQL over `ctx.socket` for its EFFECT, not its rows. Same pinned
 * mechanism 1 as `query` (the `sql` string is sent byte-for-byte, no
 * interpolation, no `$1` binding — see that action's doc comment for why),
 * but the output shape is deliberately narrower: `{ rowCount, command }`,
 * both read straight off the LAST `CommandComplete` the server sends, never
 * a row set. That is what a Postgres command tag already encodes —
 * `"INSERT 0 2"`, `"UPDATE 3"`, `"DELETE 1"`, `"SELECT 2"` — so `rowCount`
 * is the trailing integer in `command` when one is present (`"CREATE
 * TABLE"`/`"BEGIN"` have none, so `rowCount` is `0`), not a count this
 * action derives by buffering `DataRow` frames.
 *
 * A multi-statement `sql` (`;`-separated) is legal here exactly as it is for
 * `query`: Postgres's Simple Query protocol runs every statement in the
 * string over ONE session before sending the single `ReadyForQuery` that
 * ends the exchange, so `CREATE TEMP TABLE` + `INSERT` + `SELECT` in one
 * `sql` value all happen inside the one socket this invocation holds — the
 * only way to prove a temp table's writes actually landed, since the
 * connection (and the temp table with it) closes when this action's
 * `execute` returns.
 */
const executeAction: ActionDefinition<Input, Output> = {
  key: "execute",
  type: "perform",
  resource: "execute",
  title: "Execute",
  description: "Run SQL against the connection's database and return the affected-row count and " +
    "command tag — not the rows themselves (use Query for that).",
  // Arbitrary SQL may be DML/DDL; a caller must judge idempotency for their own statement.
  idempotent: false,
  params: [
    {
      key: "sql",
      label: "SQL",
      type: "code",
      ui: "code:sql",
      required: true,
      config: { multiline: true },
      hint: "Sent verbatim as a Simple Query — no parameter binding in v1. Never splice " +
        "untrusted input into this string; build the statement the same way you would for " +
        "psql.",
    },
  ],
  output: [
    { key: "rowCount", type: "number", label: "Affected-row count" },
    { key: "command", type: "string", label: 'Command tag (e.g. "SELECT 3", "INSERT 0 1")' },
  ],

  async execute(input, ctx) {
    const socket = ctx.socket;
    if (!socket) {
      throw new Error(
        "postgres: ctx.socket is unavailable — this Connection was not opened with the socket " +
          "capability (see package.json's w6w.capabilities.socket)",
      );
    }

    // Debug-level only, and the redacted Connection is the whole point of
    // logging it: proves (and lets a live test observe, via `onLog`) that
    // credential isolation held all the way down to this hook's own `ctx`,
    // not just at the wire — `ctx.connection` never carries a `credential`
    // key (see `@w6w/types`'s `RedactedConnection`).
    ctx.log("debug", "postgres: execute invoked", { connection: ctx.connection });

    await socket.write(encodeQuery(input.sql));

    const reader = new FrameReader();
    let command = "";

    while (true) {
      let frame = reader.next();
      while (frame === null) {
        const chunk = await socket.read();
        if (chunk === null) {
          throw new Error("postgres: connection closed before the statement finished");
        }
        reader.push(chunk);
        frame = reader.next();
      }

      switch (frame.type) {
        case "C":
          // Overwritten on every CommandComplete in a multi-statement `sql` —
          // by design, only the LAST statement's tag survives, same as `query`'s
          // own `command` field.
          command = parseCommandComplete(frame);
          break;
        case "E":
          throw new Error(`postgres: ${parseErrorResponse(frame).message}`);
        case "Z":
          return { rowCount: parseAffectedRows(command), command };
        default:
          // RowDescription / DataRow / NoticeResponse / ParameterStatus / other
          // frames this action does not surface — already correctly sized and
          // skipped by FrameReader itself.
          break;
      }
    }
  },
};

/**
 * The affected-row count IS the command tag's own trailing integer
 * (`"INSERT 0 2"` -> `2`, `"UPDATE 3"` -> `3`, `"SELECT 2"` -> `2`); a tag
 * with none (`"CREATE TABLE"`, `"BEGIN"`) affected no rows in that sense.
 */
function parseAffectedRows(command: string): number {
  const match = command.match(/(\d+)\s*$/);
  return match ? Number(match[1]) : 0;
}

export default executeAction;
