import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { BASE_PATH, mockCtx, queryOf } from "../_helpers.ts";
import trigger from "../../triggers/new-row.ts";

const params = { tableName: "Orders", viewName: "Newest first" };
const base = { _id: "r1", _ctime: "2026-11-09T10:00:00Z" };
const fresh = { _id: "r2", _ctime: "2026-11-09T11:00:00Z" };

async function poll(rows: unknown[], state: unknown) {
  const mock = mockCtx([{ body: { rows } }]);
  const result = await trigger.poll!({ params, state }, mock.ctx);
  return { ...mock, result };
}

test("new-row seeds, emits new rows, retries idempotently, and requests the configured newest-first view", async () => {
  const seeded = await poll([base], {});
  assertEquals(seeded.result.events, []);
  assertEquals(seeded.result.nextState.seeded, true);
  assertEquals(new URL(seeded.calls[0].url).pathname, `${BASE_PATH}/rows/`);
  assertEquals(queryOf(seeded.calls[0].url), {
    table_name: "Orders",
    view_name: "Newest first",
    limit: "100",
    convert_keys: "true",
  });

  const changed = await poll([fresh, base], seeded.result.nextState);
  assertEquals(changed.result.events, [fresh]);
  const again = await poll([fresh, base], seeded.result.nextState);
  assertEquals(again.result, changed.result);
});
