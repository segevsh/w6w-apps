import { assertEquals } from "@std/assert";
import loggedTimeCreate from "../../actions/logged-time-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("logged-time-create - POSTs /logged-time and unwraps the 200 array response under `entries`", async () => {
  // Real Float behaviour: unlike every other create in this app, this one
  // answers 200 (not 201) with an ARRAY, even though exactly one entry is
  // created.
  const { ctx, calls } = mockCtx([
    { status: 200, body: [{ logged_time_id: "5e38963be429adc74664c777", hours: 5.25 }] },
  ]);
  const out = await loggedTimeCreate.execute(
    { peopleId: 9876, projectId: 4567, date: "2022-12-12", hours: 5.25 },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v3/logged-time");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.people_id, 9876);
  assertEquals(body.hours, 5.25);
  assertEquals(out, { entries: [{ logged_time_id: "5e38963be429adc74664c777", hours: 5.25 }] });
});

Deno.test("logged-time-create - hours:0 is sent through unchanged (a documented soft-delete, not an omission)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await loggedTimeCreate.execute({ peopleId: 1, projectId: 1, date: "2025-01-01", hours: 0 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).hours, 0);
});
