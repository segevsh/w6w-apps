import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockSalesforceCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-record.ts";

const params = { object: "Contact", fields: "Id,Name,CreatedDate" };
const base = { Id: "1", Name: "Base", CreatedDate: "2026-11-09T10:00:00.000+0000" };
const fresh = { Id: "2", Name: "Fresh", CreatedDate: "2026-11-09T11:00:00.000+0000" };

async function poll(records: unknown[], state: unknown) {
  const mock = mockSalesforceCtx([{ body: { records } }]);
  const result = await trigger.poll!({ params, state }, mock.ctx);
  return { ...mock, result };
}

test("new-record seeds, emits new records, retries idempotently, and uses the ordered query endpoint", async () => {
  const seeded = await poll([base], {});
  assertEquals(seeded.result.events, []);
  assertEquals(seeded.result.nextState.seeded, true);
  assertEquals(new URL(seeded.calls[0].url).pathname, "/services/data/v60.0/query");
  assertEquals(
    new URL(seeded.calls[0].url).searchParams.get("q"),
    "SELECT Id, Name, CreatedDate FROM Contact ORDER BY CreatedDate DESC LIMIT 100",
  );

  const changed = await poll([fresh, base], seeded.result.nextState);
  assertEquals(changed.result.events, [fresh]);
  const again = await poll([fresh, base], seeded.result.nextState);
  assertEquals(again.result, changed.result);
});
