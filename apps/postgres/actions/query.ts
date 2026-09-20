import type { ActionDefinition } from "@w6w/types";
import {
  encodeQuery,
  FrameReader,
  parseCommandComplete,
  parseDataRow,
  parseErrorResponse,
  parseRowDescription,
} from "../lib/wire.ts";

interface Input {
  sql: string;
}

interface Output {
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  command: string;
}

/**
 * Run SQL over `ctx.socket` and return the rows. The one thing worth saying
 * twice, because it is the entire reason this action has no `params` field
 * beyond `sql`: **the string is sent byte-for-byte as a Postgres Simple
 * Query message** (pinned mechanism 1). There is no `$1` placeholder syntax,
 * no bind-variable array, and no quoting helper anywhere in this app — any
 * of those would mean building the outgoing SQL from more than one input,
 * which is exactly the shape of an injection surface Postgres's Extended
 * Query protocol (Parse/Bind/Execute) exists to avoid. Binding is
 * deliberately out of scope for v1 (see the app README); callers build their
 * own statement the same way they would handing SQL to `psql`.
 *
 * `ctx.socket.read()` can return several Postgres messages batched into one
 * chunk, or split one message across two chunks — reading the wire protocol
 * docs' example transcripts makes this look rarer than it is over a real
 * network. This loop never assumes otherwise (pinned mechanism 3): every
 * `read()` result is pushed into the SAME `FrameReader` and `next()` is
 * called until it stops yielding frames, only then reading again.
 */
const query: ActionDefinition<Input, Output> = {
  key: "query",
  type: "perform",
  resource: "query",
  title: "Query",
  description: "Run SQL directly against the connection's database and return the rows.",
  // Arbitrary SQL may be DML (INSERT/UPDATE/DELETE) — a caller must judge idempotency themselves.
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
    { key: "rows", type: "array", label: "Rows" },
    { key: "rowCount", type: "number", label: "Row count" },
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

    await socket.write(encodeQuery(input.sql));

    const reader = new FrameReader();
    let columns: string[] = [];
    const rows: Array<Record<string, unknown>> = [];
    let command = "";

    while (true) {
      let frame = reader.next();
      while (frame === null) {
        const chunk = await socket.read();
        if (chunk === null) {
          throw new Error("postgres: connection closed before the query finished");
        }
        reader.push(chunk);
        frame = reader.next();
      }

      switch (frame.type) {
        case "T":
          columns = parseRowDescription(frame).map((f) => f.name);
          break;
        case "D": {
          const values = parseDataRow(frame);
          const row: Record<string, unknown> = {};
          columns.forEach((name, i) => {
            row[name] = values[i] ?? null;
          });
          rows.push(row);
          break;
        }
        case "C":
          command = parseCommandComplete(frame);
          break;
        case "E":
          throw new Error(`postgres: ${parseErrorResponse(frame).message}`);
        case "Z":
          // ReadyForQuery — the query cycle (whether it produced rows, an
          // empty result, or nothing but a command tag) is complete.
          return { rows, rowCount: rows.length, command };
        default:
          // NoticeResponse / ParameterStatus / other frames we don't act on
          // — already correctly sized and skipped by FrameReader itself.
          break;
      }
    }
  },
};

export default query;
