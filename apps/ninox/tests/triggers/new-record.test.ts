import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-record.ts";
import { connCtx, listEnvelope } from "../_helpers.ts";

test("new-record seeds, emits, retries, and requests the newest page", async () => {
  const params = { moduleName: "crm", tableName: "contacts" };
  const seed = connCtx([{ body: listEnvelope([{ id: "old", values: {} }]) }]);
  const seeded = await trigger.poll!({ state: {}, params } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://go.ninox.com/api/v1/workspace/abcdefghij12/modules/crm/tables/contacts/records?sort=-_md&limit=100&offset=0",
  );
  const responses = [{
    body: listEnvelope([{ id: "new", values: {} }, { id: "old", values: {} }]),
  }];
  const first = await trigger.poll!(
    { state: seeded.nextState, params } as never,
    connCtx(responses).ctx,
  );
  const retry = await trigger.poll!(
    { state: seeded.nextState, params } as never,
    connCtx(responses).ctx,
  );
  assertEquals(first.events, [{ id: "new", values: {} }]);
  assertEquals(retry, first);
});
