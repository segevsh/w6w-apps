import { assertEquals, assertRejects } from "@std/assert";
import eventRetrieve from "../../actions/event-retrieve.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("event-retrieve: GETs by id and encodes it into the path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "evt one/two", title: "X" } }]);
  const out = await eventRetrieve.execute({ eventId: "evt one/two" }, ctx) as { id: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/calevent/v2/events/evt%20one%2Ftwo");
  assertEquals(out.id, "evt one/two");
});

Deno.test("event-retrieve: a 404 on an unknown id surfaces as an error", async () => {
  const { ctx } = mockCtx([{ status: 404, body: undefined }]);
  await assertRejects(
    () => Promise.resolve(eventRetrieve.execute({ eventId: "missing" }, ctx)),
    Error,
  );
});
