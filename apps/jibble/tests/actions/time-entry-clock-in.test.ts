import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import timeEntryClockIn from "../../actions/time-entry-clock-in.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("time-entry-clock-in: POSTs type In with the confirmed clientType", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "t1", type: "In" } }]);
  await timeEntryClockIn.execute({ personId: "p1", activityId: "a1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/TimeEntries");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.personId, "p1");
  assertEquals(body.type, "In");
  assertEquals(body.activityId, "a1");
  assertEquals(body.clientType, "Web");
});

test("time-entry-clock-in: builds coordinates only when both lat/lng are set", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await timeEntryClockIn.execute({ personId: "p1", latitude: 42 }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("coordinates" in body, false);
});

test("time-entry-clock-in: requires personId", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(timeEntryClockIn.execute({ personId: "" }, ctx)),
    Error,
    "personId",
  );
});
