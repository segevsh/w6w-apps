import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import appointmentCreate from "../../actions/appointment-create.ts";

Deno.test("appointment-create: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await appointmentCreate.execute({
    "locationUid": "locationUid-1",
    "contactName": "contactName-1",
    "contactPhoneNumber": "+15555550123",
    "datetime": "2026-10-01T00:00:00Z",
    "durationMin": 5,
    "assignedUserUid": "assignedUserUid-1",
    "note": "note text",
    "status": "cancelled",
    "type": "in_person",
  } as never, ctx);
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "POST");
  assertEquals(url.origin + url.pathname, API + "/appointments");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(JSON.parse(call.body ?? "null"), {
    "locationUid": "locationUid-1",
    "contactName": "contactName-1",
    "contactPhoneNumber": "+15555550123",
    "datetime": "2026-10-01T00:00:00Z",
    "durationMin": 5,
    "assignedUserUid": "assignedUserUid-1",
    "note": "note text",
    "status": "cancelled",
    "type": "in_person",
  });
  assertEquals(call.headers["content-type"], "application/json");
  assertEquals(result, { uid: "r1" });
});

Deno.test("appointment-create: a minimal call sends only what was set", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await appointmentCreate.execute(
    {
      "locationUid": "locationUid-1",
      "contactName": "contactName-1",
      "contactPhoneNumber": "+15555550123",
      "datetime": "2026-10-01T00:00:00Z",
    } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "POST");
  assertEquals(url.origin + url.pathname, API + "/appointments");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(JSON.parse(call.body ?? "null"), {
    "locationUid": "locationUid-1",
    "contactName": "contactName-1",
    "contactPhoneNumber": "+15555550123",
    "datetime": "2026-10-01T00:00:00Z",
  });
  assertEquals(call.headers["content-type"], "application/json");
  assertEquals(result, { uid: "r1" });
});

Deno.test("appointment-create: declares its params and kind", () => {
  assertEquals((appointmentCreate.params ?? []).map((p) => p.key), [
    "locationUid",
    "contactName",
    "contactPhoneNumber",
    "datetime",
    "durationMin",
    "assignedUserUid",
    "note",
    "status",
    "type",
  ]);
  assertEquals((appointmentCreate.params ?? []).filter((p) => p.required).map((p) => p.key), [
    "locationUid",
    "contactName",
    "contactPhoneNumber",
    "datetime",
  ]);
  assertEquals(appointmentCreate.type, "perform");
  assertEquals(appointmentCreate.idempotent, false);
});
