import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-event.ts";

test("new-event seeds, emits, retries, and requests the event feed", async () => {
  const old = { uuid: "old" }, fresh = { uuid: "fresh" };
  const seed = mockCtx([{ body: [old] }], {
    display: { environment: "production", companyId: "co-1" },
  });
  const seeded = await trigger.poll!({ params: {}, state: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const page = mockCtx([{ body: [fresh, old] }], {
    display: { environment: "production", companyId: "co-1" },
  });
  const result = await trigger.poll!({ params: {}, state: seeded.nextState } as never, page.ctx);
  assertEquals(result.events, [fresh]);
  assertEquals(
    await trigger.poll!(
      { params: {}, state: seeded.nextState } as never,
      mockCtx([{ body: [fresh, old] }], {
        display: { environment: "production", companyId: "co-1" },
      }).ctx,
    ),
    result,
  );
  assertEquals({ method: seed.calls[0].method, path: new URL(seed.calls[0].url).pathname }, {
    method: "GET",
    path: "/v1/events",
  });
});
