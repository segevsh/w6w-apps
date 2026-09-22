import { assertEquals } from "@std/assert";
import action from "../../actions/create-package-instance.ts";
import { API_ROOT, bodyOf, mockCtx, urlOf } from "../_helpers.ts";

const created = { id: "pi-9", name: "Ada's package" };
const required = { clientRecordId: "rec-1", packageId: "pkg-1", name: "Ada's package" };

Deno.test("create-package-instance: POSTs to /consultant/packages/instances", async () => {
  const { ctx, calls } = mockCtx([{ body: created }]);
  const result = await action.execute(required, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(urlOf(calls[0]), `${API_ROOT}/consultant/packages/instances`);
  const body = bodyOf(calls[0]);
  assertEquals(body.clientRecordId, "rec-1");
  assertEquals(body.packageId, "pkg-1");
  assertEquals(body.name, "Ada's package");
  assertEquals(result, created);
});

Deno.test("create-package-instance: the optional shape is passed through as given", async () => {
  const { ctx, calls } = mockCtx([{ body: created }]);
  await action.execute({
    ...required,
    asConsultantId: "con-2",
    fee: { amount: 200, currency: "USD" },
    expiryDate: "2027-01-01T00:00:00Z",
    maximumSessionsPerMonth: 4,
    maximumSessionsPerWeek: 1,
    notes: "sold at the front desk",
    notify: true,
    notificationOptions: { email: true },
    services: [{ serviceId: "svc-1", quantity: 6 }],
    courses: [{ courseId: "course-1" }],
  }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.asConsultantId, "con-2");
  assertEquals(body.fee, { amount: 200, currency: "USD" });
  assertEquals(body.expiryDate, "2027-01-01T00:00:00Z");
  assertEquals(body.maximumSessionsPerMonth, 4);
  assertEquals(body.maximumSessionsPerWeek, 1);
  assertEquals(body.notes, "sold at the front desk");
  assertEquals(body.notify, true);
  assertEquals(body.notificationOptions, { email: true });
  assertEquals(body.services, [{ serviceId: "svc-1", quantity: 6 }]);
  assertEquals(body.courses, [{ courseId: "course-1" }]);
});

Deno.test("create-package-instance: only the three required fields go out when nothing else is set", async () => {
  const { ctx, calls } = mockCtx([{ body: created }]);
  await action.execute(required, ctx);
  assertEquals(Object.keys(bodyOf(calls[0])).sort(), ["clientRecordId", "name", "packageId"]);
  assertEquals(action.idempotent, false);
});

Deno.test("create-package-instance: a JSON-string service array is parsed, not double-encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: created }]);
  await action.execute({ ...required, services: '[{"serviceId":"svc-1"}]' }, ctx);
  assertEquals(bodyOf(calls[0]).services, [{ serviceId: "svc-1" }]);
});
