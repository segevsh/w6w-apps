import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/funnel-query.ts";

const funnel = ok({
  data: [{
    events: ["Signup Started", "Signup Completed", "First Purchase"],
    cumulativeRaw: [1000, 400, 100],
  }],
});

const steps =
  '[{"event_type":"Signup Started"},{"event_type":"Signup Completed"},{"event_type":"First Purchase"}]';

/** Each step is its own `e` parameter. */
Deno.test("funnel-query: sends one `e` parameter per step, in order", async () => {
  const { ctx, calls } = mockCtx([funnel], { display });
  await action.execute!({ events: steps, start: "20260801", end: "20260818" }, ctx);
  const url = new URL(calls[0].url);
  const es = url.searchParams.getAll("e");
  assertEquals(es.length, 3);
  assert(es[0].includes("Signup Started"), es[0]);
});

/**
 * stepFunction is cumulative — step 3 is everyone who reached it, not everyone
 * who went from 2 to 3.
 */
Deno.test("funnel-query: computes drop-off from the cumulative counts", async () => {
  const { ctx } = mockCtx([funnel], { display });
  const result = await action.execute!({
    events: steps,
    start: "20260801",
    end: "20260818",
  }, ctx) as {
    steps: Array<{ step: number; users: number }>;
    dropOff: Array<{ from: number; to: number; lost: number }>;
    conversionRate: number;
  };
  assertEquals(result.steps.map((s) => s.users), [1000, 400, 100]);
  assertEquals(result.dropOff, [
    { from: 1, to: 2, lost: 600 },
    { from: 2, to: 3, lost: 300 },
  ]);
  assertEquals(result.conversionRate, 0.1);
});

/** The window changes the answer more than anything else. */
Deno.test("funnel-query: the conversion window defaults to Amplitude's 7 days and is sent", async () => {
  const defaulted = mockCtx([funnel], { display });
  await action.execute!({ events: steps, start: "20260801", end: "20260818" }, defaulted.ctx);
  assertEquals(new URL(defaulted.calls[0].url).searchParams.get("cs"), "604800");

  const narrow = mockCtx([funnel], { display });
  await action.execute!({
    events: steps,
    start: "20260801",
    end: "20260818",
    conversionWindow: 3600,
  }, narrow.ctx);
  assertEquals(new URL(narrow.calls[0].url).searchParams.get("cs"), "3600");
});

Deno.test("funnel-query: the order mode reaches the wire", async () => {
  const { ctx, calls } = mockCtx([funnel], { display });
  await action.execute!({
    events: steps,
    start: "20260801",
    end: "20260818",
    mode: "unordered",
  }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("mode"), "unordered");
});

Deno.test("funnel-query: fewer than two steps is not a funnel", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () =>
      await action.execute!({
        events: '[{"event_type":"a"}]',
        start: "20260801",
        end: "20260818",
      }, ctx),
    Error,
    "at least two steps",
  );
  assertEquals(calls.length, 0);
});

Deno.test("funnel-query: needs both dates", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ events: steps, start: "20260801" }, ctx),
    Error,
    "both required",
  );
});

Deno.test("funnel-query: a first step of zero does not produce a divide-by-zero rate", async () => {
  const { ctx } = mockCtx([ok({ data: [{ cumulativeRaw: [0, 0] }] })], { display });
  const result = await action.execute!({
    events: '[{"event_type":"a"},{"event_type":"b"}]',
    start: "20260801",
    end: "20260818",
  }, ctx) as { conversionRate?: number };
  assertEquals(result.conversionRate, undefined);
});

Deno.test("funnel-query: warns about the window and the cumulative counts", () => {
  assert(/conversion WINDOW/.test(action.description!), action.description);
  assert(/cumulative/.test(action.description!), action.description);
});
