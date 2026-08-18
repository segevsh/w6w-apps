import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/retention-query.ts";

const retention = ok({
  data: {
    series: { "2026-08-01": [{ count: 100, outof: 100 }, { count: 40, outof: 100 }] },
    dates: ["2026-08-01", "2026-08-02"],
  },
});

Deno.test("retention-query: sends both events and the mode", async () => {
  const { ctx, calls } = mockCtx([retention], { display });
  await action.execute!({
    startEvent: '{"event_type":"_new"}',
    returnEvent: '{"event_type":"_active"}',
    start: "20260801",
    end: "20260818",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/2/retention");
  assertEquals(url.searchParams.get("se"), '{"event_type":"_new"}');
  assertEquals(url.searchParams.get("re"), '{"event_type":"_active"}');
  assertEquals(url.searchParams.get("rm"), "n");
});

/** The same data produces three different curves depending on the mode. */
Deno.test("retention-query: the mode is returned, because the number means nothing without it", async () => {
  const { ctx } = mockCtx([retention], { display });
  const result = await action.execute!({
    startEvent: '{"event_type":"_new"}',
    returnEvent: '{"event_type":"_active"}',
    start: "20260801",
    end: "20260818",
    mode: "rolling",
  }, ctx) as { mode: string; cohorts: string[] };
  assertEquals(result.mode, "rolling");
  assertEquals(result.cohorts, ["2026-08-01", "2026-08-02"]);
});

Deno.test("retention-query: each mode reaches the wire", async () => {
  for (const mode of ["n", "rolling", "brackets"]) {
    const { ctx, calls } = mockCtx([retention], { display });
    await action.execute!({
      startEvent: '{"event_type":"a"}',
      returnEvent: '{"event_type":"b"}',
      start: "20260801",
      end: "20260818",
      mode,
    }, ctx);
    assertEquals(new URL(calls[0].url).searchParams.get("rm"), mode);
  }
});

Deno.test("retention-query: needs both events and both dates", async () => {
  const noStart = mockCtx([], { display });
  await assertRejects(
    async () =>
      await action.execute!({
        returnEvent: '{"event_type":"b"}',
        start: "20260801",
        end: "20260818",
      }, noStart.ctx),
    Error,
    "`startEvent` is required",
  );

  const noDates = mockCtx([], { display });
  await assertRejects(
    async () =>
      await action.execute!({
        startEvent: '{"event_type":"a"}',
        returnEvent: '{"event_type":"b"}',
      }, noDates.ctx),
    Error,
    "both required",
  );
});

Deno.test("retention-query: logs the mode and cohort count, never the numbers", async () => {
  const { ctx, logs } = mockCtx([retention], { display });
  await action.execute!({
    startEvent: '{"event_type":"a"}',
    returnEvent: '{"event_type":"b"}',
    start: "20260801",
    end: "20260818",
  }, ctx);
  assertEquals(logs[0].data, { mode: "n", cohorts: 2 });
});

Deno.test("retention-query: says the two events are different roles", () => {
  const returnEvent = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "returnEvent")!;
  assert(/repeat usage, not retention/.test(returnEvent.hint!), returnEvent.hint);
});
