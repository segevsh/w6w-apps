import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import createEvent from "../../actions/create-event.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("create-event: PUT /events with required fields", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  await createEvent.execute(
    { name: "Onboarding", startTime: "2026-10-01T18:00:00.000Z", duration: 60, location: "ZOOM" },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v0/events");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Onboarding",
    startTime: "2026-10-01T18:00:00.000Z",
    duration: 60,
    location: "ZOOM",
  });
});

test("create-event: is not idempotent", () => {
  assertEquals(createEvent.idempotent, false);
});
