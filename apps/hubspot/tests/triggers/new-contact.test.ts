import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-contact.ts";

const base = { id: "1", properties: { createdate: "2026-11-09T10:00:00Z" } };
const fresh = { id: "2", properties: { createdate: "2026-11-09T11:00:00Z" } };

async function poll(results: unknown[], state: unknown) {
  const mock = mockCtx([{ body: { results } }]);
  const result = await trigger.poll!({ params: {}, state }, mock.ctx);
  return { ...mock, result };
}

test("new-contact seeds, emits new contacts, retries idempotently, and requests createdate descending", async () => {
  const seeded = await poll([base], {});
  assertEquals(seeded.result.events, []);
  assertEquals(seeded.result.nextState.seeded, true);
  assertEquals(new URL(seeded.calls[0].url).pathname, "/crm/v3/objects/contacts/search");
  assertEquals(JSON.parse(seeded.calls[0].body ?? "{}"), {
    sorts: [{ propertyName: "createdate", direction: "DESCENDING" }],
    limit: 100,
  });

  const changed = await poll([fresh, base], seeded.result.nextState);
  assertEquals(changed.result.events, [fresh]);
  const again = await poll([fresh, base], seeded.result.nextState);
  assertEquals(again.result, changed.result);
});
