import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockSalesforceCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-record.ts";

const params = { object: "Contact", fields: "Id,Name,CreatedDate" };
const base = { Id: "1", Name: "Base", LastModifiedDate: "2026-11-09T10:00:00.000+0000" };
const fresh = { Id: "2", Name: "Fresh", LastModifiedDate: "2026-11-09T11:00:00.000+0000" };
const edited = { ...base, Name: "Edited", LastModifiedDate: "2026-11-09T12:00:00.000+0000" };

async function poll(records: unknown[], state: unknown, p: Record<string, unknown> = params) {
  const mock = mockSalesforceCtx([{ body: { records } }]);
  const result = await trigger.poll!({ params: p, state }, mock.ctx);
  return { ...mock, result };
}

test("new-or-updated-record seeds without emitting and sends the literal modified-desc query", async () => {
  const seeded = await poll([base], {});
  assertEquals(seeded.result.events, []);
  assertEquals(seeded.result.nextState.seeded, true);
  assertEquals(seeded.calls.length, 1);
  assertEquals(seeded.calls[0].method, "GET");
  assertEquals(new URL(seeded.calls[0].url).pathname, "/services/data/v60.0/query");
  assertEquals(
    new URL(seeded.calls[0].url).searchParams.get("q"),
    "SELECT Id, Name, CreatedDate, LastModifiedDate FROM Contact ORDER BY LastModifiedDate DESC LIMIT 100",
  );
});

test("new-or-updated-record emits a new record, and an edited record as a new event", async () => {
  const seeded = await poll([base], {});
  const added = await poll([fresh, base], seeded.result.nextState);
  assertEquals(added.result.events, [fresh]);
  const changed = await poll([edited, base], seeded.result.nextState);
  assertEquals(changed.result.events, [edited]);
});

test("new-or-updated-record is idempotent for the same state and response", async () => {
  const seeded = await poll([base], {});
  const a = await poll([fresh, base], seeded.result.nextState);
  const b = await poll([fresh, base], seeded.result.nextState);
  assertEquals(a.result, b.result);
});

test("new-or-updated-record refuses an object or field name that is not an API name", async () => {
  await assertRejects(
    () => poll([], {}, { object: "Contact WHERE Id != null", fields: "Id" }),
    Error,
    "letters, numbers, and underscores",
  );
  await assertRejects(
    () => poll([], {}, { object: "Contact", fields: "Id, Name FROM User --" }),
    Error,
    "letters, numbers, and underscores",
  );
});
