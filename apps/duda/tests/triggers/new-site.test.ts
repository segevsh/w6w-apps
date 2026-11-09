import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockConnectedCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-site.ts";

const page = (results: unknown[]) => ({ body: { results } });

test("new-site seeds, emits unseen sites, retries idempotently, and requests newest first", async () => {
  const seeded = await trigger.poll!(
    { params: {}, state: {} } as never,
    mockConnectedCtx([page([{ site_name: "a" }])]).ctx,
  ) as never as { events: unknown[]; nextState: unknown };
  assertEquals(seeded.events, []);
  const nextCtx = mockConnectedCtx([page([{ site_name: "b" }, { site_name: "a" }])]);
  const next = await trigger.poll!({ params: {}, state: seeded.nextState } as never, nextCtx.ctx);
  assertEquals((next as never as { events: unknown[] }).events, [{ site_name: "b" }]);
  const retry = await trigger.poll!(
    { params: {}, state: seeded.nextState } as never,
    mockConnectedCtx([page([{ site_name: "b" }, { site_name: "a" }])]).ctx,
  );
  assertEquals(retry, next);
  assertEquals(
    nextCtx.calls[0].url,
    "https://api.duda.co/api/sites/multiscreen?limit=100&offset=0&sort=CREATION_DATE&direction=DESC",
  );
});
