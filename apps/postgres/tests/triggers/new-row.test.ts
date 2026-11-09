import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import {
  commandComplete,
  concatBytes,
  dataRow,
  mockCtx,
  readyForQuery,
  rowDescription,
} from "../_helpers.ts";
import { encodeQuery } from "../../lib/wire.ts";
import trigger from "../../triggers/new-row.ts";

const params = { table: "public.orders", column: "created_at" };
const base = "2026-11-09T10:00:00Z";
const fresh = "2026-11-09T11:00:00Z";
const sql = 'SELECT * FROM "public"."orders" ORDER BY "created_at" DESC LIMIT 100';

function response(values: string[]) {
  return concatBytes(
    rowDescription(["created_at", "id"]),
    ...values.map((createdAt, index) => dataRow([createdAt, String(index + 1)])),
    commandComplete(`SELECT ${values.length}`),
    readyForQuery(),
  );
}

async function poll(values: string[], state: unknown) {
  const mock = mockCtx([response(values)]);
  const result = await trigger.poll!({ params, state }, mock.ctx);
  return { ...mock, result };
}

test("new-row seeds, emits new rows, retries idempotently, and uses a bounded ordered query", async () => {
  const seeded = await poll([base], {});
  assertEquals(seeded.result.events, []);
  assertEquals(seeded.result.nextState.seeded, true);
  assertEquals(seeded.mock.writes, [encodeQuery(sql)]);

  const changed = await poll([fresh, base], seeded.result.nextState);
  assertEquals(changed.result.events, [{ created_at: fresh, id: "1" }]);
  const again = await poll([fresh, base], seeded.result.nextState);
  assertEquals(again.result, changed.result);
});
