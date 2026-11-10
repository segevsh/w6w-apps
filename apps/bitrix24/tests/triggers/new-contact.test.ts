import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-contact.ts";

const response = (result: unknown[]) => ({ body: { result, total: result.length } });
const options = { display: { portalUrl: "https://myportal.bitrix24.com" } };

test("new-contact seeds, emits, retries, and sends DATE_CREATE descending", async () => {
  const seed = await trigger.poll!(
    { params: {}, state: {} },
    mockCtx([response([{ ID: "a" }])], options).ctx,
  );
  assertEquals(seed.events, []);
  const nextCtx = mockCtx([response([{ ID: "b" }, { ID: "a" }])], options);
  const next = await trigger.poll!({ params: {}, state: seed.nextState }, nextCtx.ctx);
  assertEquals(next.events, [{ ID: "b" }]);
  const retry = await trigger.poll!(
    { params: {}, state: seed.nextState },
    mockCtx([response([{ ID: "b" }, { ID: "a" }])], options).ctx,
  );
  assertEquals(retry, next);
  assertEquals(nextCtx.calls[0].url, "https://myportal.bitrix24.com/rest/crm.contact.list");
  assertEquals(nextCtx.calls[0].body, '{"order":{"DATE_CREATE":"DESC"},"start":0}');
});
