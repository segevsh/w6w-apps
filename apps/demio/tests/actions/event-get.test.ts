import { assertEquals, assertRejects } from "@std/assert";
import eventGet from "../../actions/event-get.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("event-get: GET /event/{id} with the active flag", async () => {
  const body = { id: 1, name: "E", next_date_id: 158, dates: [{ date_id: 158 }] };
  const { ctx, calls } = mockCtx([{ body }, { body }]);
  assertEquals(await eventGet.execute({ eventId: 1 }, ctx), body);
  assertEquals(calls[0].url, `${API_ROOT}/event/1`);
  await eventGet.execute({ eventId: 1, activeOnly: true }, ctx);
  assertEquals(calls[1].url, `${API_ROOT}/event/1?active=true`);
});

Deno.test("event-get: a 404 surfaces the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { messages: ["Event not found"] } }]);
  await assertRejects(
    async () => await eventGet.execute({ eventId: 9 }, ctx),
    Error,
    "Event not found",
  );
});
