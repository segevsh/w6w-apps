import { assertEquals } from "@std/assert";
import eventList from "../../actions/event-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("event-list: GET /events/query?startAfterSequenceId=", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: listEnvelope([{
        id: "e1",
        type: "event",
        attributes: { eventType: "message/created", sequenceId: 1235 },
      }], {
        totalItems: null,
        totalPages: null,
        page: 1,
        perPage: 100,
        paginationUnsupported: true,
      }),
    },
  ]);
  const result = await eventList.execute({ startAfterSequenceId: 1234 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/integration_api/events/query");
  assertEquals(queryOf(calls[0].url), { startAfterSequenceId: "1234" });
  assertEquals(
    (result as { meta: { paginationUnsupported: boolean } }).meta.paginationUnsupported,
    true,
  );
});

Deno.test("event-list: eventTypes and relatedResourceId pass through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([]) }]);
  await eventList.execute({ eventTypes: "listing/updated", relatedResourceId: "l1" }, ctx);
  assertEquals(queryOf(calls[0].url), { eventTypes: "listing/updated", relatedResourceId: "l1" });
});
