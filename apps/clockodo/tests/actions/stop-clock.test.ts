import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/stop-clock.ts";
import { API_ROOT, exec, mockCtx } from "../_helpers.ts";

Deno.test("stop-clock: DELETEs /v2/clock/{id} with query flags", async () => {
  const { ctx, calls } = mockCtx([{
    body: { running: null, stopped: { id: 11 }, current_time: "t" },
  }]);
  const out = await exec(action, {
    id: 11,
    startNew: true,
    away: 5,
    timeUntil: "2026-10-06T10:00:00Z",
  }, ctx);
  assertEquals(calls[0].method, "DELETE");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/clock/11");
  assertEquals(url.searchParams.get("start_new"), "true");
  assertEquals(url.searchParams.get("away"), "5");
  assertEquals(url.searchParams.get("time_until"), "2026-10-06T10:00:00Z");
  assertEquals(out.stopped, { id: 11 });
});

Deno.test("stop-clock: plain stop has no query; a bad id is refused", async () => {
  const { ctx, calls } = mockCtx([{ body: { stopped: { id: 2 } } }]);
  await exec(action, { id: 2 }, ctx);
  assertEquals(calls[0].url, `${API_ROOT}/v2/clock/2`);
  await assertRejects(() => exec(action, { id: "" }, mockCtx().ctx), Error, "positive integer");
});
