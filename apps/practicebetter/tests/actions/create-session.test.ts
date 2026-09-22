import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/create-session.ts";
import { API_ROOT, bodyOf, mockCtx, urlOf } from "../_helpers.ts";

const booked = { id: "sess-9", duration: 60, confirmationStatus: "confirmed" };

const required = {
  clientRecordId: "rec-1",
  duration: 60,
  serviceId: "svc-1",
  serviceType: "face",
  sessionDate: "2026-09-22T09:00:00Z",
};

Deno.test("create-session: POSTs the booking to /consultant/sessions", async () => {
  const { ctx, calls } = mockCtx([{ body: booked }]);
  const result = await action.execute(required, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(urlOf(calls[0]), `${API_ROOT}/consultant/sessions`);
  const body = bodyOf(calls[0]);
  assertEquals(body.clientRecordId, "rec-1");
  assertEquals(body.duration, 60);
  assertEquals(body.serviceId, "svc-1");
  assertEquals(body.serviceType, "face");
  assertEquals(body.sessionDate, "2026-09-22T09:00:00Z");
  assertEquals(result, booked);
});

Deno.test("create-session: optional fields are sent only when set", async () => {
  const { ctx, calls } = mockCtx([{ body: booked }]);
  await action.execute({
    ...required,
    asConsultantId: "con-2",
    fee: { amount: 120, currency: "USD" },
    location: { id: "loc-1" },
    notes: "first visit",
    notify: true,
    markConfirmed: true,
    ignoreConflict: true,
    timeZone: "Eastern Time (US & Canada)",
    telehealthSettings: { launchApplication: true },
    notificationOptions: { email: true },
    buffer: { before: 10 },
  }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.asConsultantId, "con-2");
  assertEquals(body.fee, { amount: 120, currency: "USD" });
  assertEquals(body.location, { id: "loc-1" });
  assertEquals(body.notes, "first visit");
  assertEquals(body.notify, true);
  assertEquals(body.markConfirmed, true);
  assertEquals(body.ignoreConflict, true);
  assertEquals(body.timeZone, "Eastern Time (US & Canada)");
  assertEquals(body.telehealthSettings, { launchApplication: true });
  assertEquals(body.notificationOptions, { email: true });
  assertEquals(body.buffer, { before: 10 });

  const bare = mockCtx([{ body: booked }]);
  await action.execute(required, bare.ctx);
  assertEquals(Object.keys(bodyOf(bare.calls[0])).sort(), Object.keys(required).sort());
});

Deno.test("create-session: a 409 scheduling conflict is surfaced, not treated as booked", async () => {
  const { ctx } = mockCtx([{
    status: 409,
    body: { message: "The consultant is not available at this time." },
  }]);
  const err = await assertRejects(async () => await action.execute(required, ctx)) as Error;
  assert(/HTTP 409/.test(err.message), err.message);
  assert(/conflict/.test(err.message), err.message);
});

Deno.test("create-session: serviceType is the documented three-value enum", () => {
  const serviceType = action.params!.find((p) => p.key === "serviceType")!;
  assertEquals(serviceType.required, true);
  assertEquals(
    (serviceType.options as Array<{ value: string }>).map((o) => o.value),
    ["face", "phone", "virtual"],
  );
  assert(/launchApplication/.test(serviceType.hint!), serviceType.hint);
  assertEquals(action.idempotent, false);
});

Deno.test("create-session: the virtual/telehealth rule and the time-zone source are documented", () => {
  const telehealth = action.params!.find((p) => p.key === "telehealthSettings")!;
  assert(/virtual/.test(telehealth.hint!), telehealth.hint);
  const timeZone = action.params!.find((p) => p.key === "timeZone")!;
  assert(/list-timezones/.test(timeZone.hint!), timeZone.hint);
});
