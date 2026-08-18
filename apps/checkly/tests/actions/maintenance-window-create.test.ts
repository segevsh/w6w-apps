import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/maintenance-window-create.ts";

const WINDOW = {
  name: "Deploy",
  startsAt: "2026-08-18T12:00:00.000Z",
  endsAt: "2026-08-18T13:00:00.000Z",
};

/** Silencing keeps the results; pausing loses them. */
Deno.test("maintenance-window-create: silence and pause are opposite flags", async () => {
  const silence = mockCtx([{ status: 201, body: { id: 1 } }]);
  await action.execute!({ ...WINDOW, mode: "silence" }, silence.ctx);
  const a = JSON.parse(silence.calls[0].body!);
  assertEquals([a.silenceAllAlerts, a.pauseAllChecks], [true, false]);

  const pause = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({ ...WINDOW, mode: "pause" }, pause.ctx);
  const b = JSON.parse(pause.calls[0].body!);
  assertEquals([b.silenceAllAlerts, b.pauseAllChecks], [false, true]);
});

Deno.test("maintenance-window-create: silencing is the default", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!(WINDOW, ctx);
  assertEquals(JSON.parse(calls[0].body!).silenceAllAlerts, true);
});

Deno.test("maintenance-window-create: tags scope the window", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({ ...WINDOW, tags: "production, api" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).tags, ["production", "api"]);
});

Deno.test("maintenance-window-create: a repeat sends its interval, one-off does not", async () => {
  const once = mockCtx([{ status: 201, body: {} }]);
  await action.execute!(WINDOW, once.ctx);
  assertEquals(JSON.parse(once.calls[0].body!).repeatInterval, undefined);

  const weekly = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({ ...WINDOW, repeatUnit: "WEEK", repeatInterval: 2 }, weekly.ctx);
  const body = JSON.parse(weekly.calls[0].body!);
  assertEquals([body.repeatUnit, body.repeatInterval], ["WEEK", 2]);
});

/** A window that ends before it starts silences nothing, silently. */
Deno.test("maintenance-window-create: an end before the start is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await action.execute!({
        ...WINDOW,
        endsAt: "2026-08-18T11:00:00.000Z",
      }, ctx),
    Error,
    "`endsAt` must be after `startsAt`",
  );
  assertEquals(calls.length, 0);
});

Deno.test("maintenance-window-create: name and both times are required", async () => {
  for (
    const input of [
      { startsAt: WINDOW.startsAt, endsAt: WINDOW.endsAt },
      { name: "x", endsAt: WINDOW.endsAt },
      { name: "x", startsAt: WINDOW.startsAt },
    ]
  ) {
    const { ctx, calls } = mockCtx([]);
    await assertRejects(async () => await action.execute!(input, ctx), Error);
    assertEquals(calls.length, 0);
  }
  assert(action.description!.includes("deploy-window"), action.description);
});
