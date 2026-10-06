import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import changeStatus from "../../actions/change-booking-status.ts";

Deno.test("change-booking-status: each transition hits its own v1 PUT", async () => {
  const transitions = ["book", "tentative", "decline", "reopen", "recover"];
  const { ctx, calls } = mockCtx(transitions.map(() => ({ status: 200, body: undefined })));
  for (const transition of transitions) {
    await changeStatus.execute({ bookingId: 3, transition }, ctx);
  }
  assertEquals(
    calls.map((c) => `${c.method} ${pathOf(c.url)}`),
    transitions.map((t) => `PUT /v1/reservation/booking/3/${t}`),
  );
  for (const c of calls) assertEquals(c.body, null);
});

Deno.test("change-booking-status: requestPayment only goes where the document lists it", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }, { body: undefined }]);
  await changeStatus.execute({ bookingId: 3, transition: "book", requestPayment: true }, ctx);
  await changeStatus.execute({ bookingId: 3, transition: "decline", requestPayment: true }, ctx);
  assertEquals(queryOf(calls[0].url), { requestPayment: "true" });
  assertEquals(queryOf(calls[1].url), {});
});

Deno.test("change-booking-status: an unknown transition is refused before any call", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(changeStatus.execute({ bookingId: 3, transition: "nuke" }, ctx)),
    Error,
    "transition",
  );
  assertEquals(calls.length, 0);
});
