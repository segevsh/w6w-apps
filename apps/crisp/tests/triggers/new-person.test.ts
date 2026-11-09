import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-person.ts";

const page = (data: unknown[]) => ({ body: { error: false, data } });
test("new-person seeds, emits once, retries idempotently, and requests newest people", async () => {
  const params = { pageNumber: 1 };
  const seeded = await trigger.poll!(
    { params, state: {} },
    mockCtx([page([{ people_id: "a" }])], "site_1").ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const next = page([{ people_id: "b" }, { people_id: "a" }]);
  const first = mockCtx([next], "site_1");
  const emitted = await trigger.poll!({ params, state: seeded.nextState }, first.ctx);
  assertEquals(emitted.events, [{ people_id: "b" }]);
  assertEquals({
    method: first.calls[0].method,
    path: new URL(first.calls[0].url).pathname,
    query: Object.fromEntries(new URL(first.calls[0].url).searchParams),
  }, {
    method: "GET",
    path: "/v1/website/site_1/people/profiles/1",
    query: { per_page: "50", sort_field: "created_at", sort_order: "desc" },
  });
  assertEquals(
    await trigger.poll!({ params, state: seeded.nextState }, mockCtx([next], "site_1").ctx),
    emitted,
  );
});
