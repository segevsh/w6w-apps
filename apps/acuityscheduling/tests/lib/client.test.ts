import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { AcuityClient } from "../../lib/client.ts";

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new AcuityClient(ctx);
  const result = await client.request("/appointments/1/cancel", { method: "PUT" });
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: '{"message":"Appointment not found"}' },
  ]);
  const client = new AcuityClient(ctx);
  const err = await assertRejects(
    () => client.request("/appointments/999"),
    Error,
    "Acuity Scheduling 404",
  );
  assertEquals(err.message.includes("/appointments/999"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const client = new AcuityClient(ctx);
  await client.request("/clients", {
    query: { search: "kept", other: undefined },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("search"), "kept");
  assertEquals(url.searchParams.has("other"), false);
});

Deno.test("client: serializes array query params as repeated key[] pairs", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const client = new AcuityClient(ctx);
  await client.request("/availability/times", {
    query: { date: "2026-08-15", appointmentTypeID: 1, addonIDs: [10, 20] },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("addonIDs[]"), ["10", "20"]);
});

Deno.test("client: JSON body sets content-type and serializes", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new AcuityClient(ctx);
  await client.request("/appointments", {
    method: "POST",
    body: { appointmentTypeID: 1, firstName: "A", lastName: "B", email: "a@b.com" },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(
    JSON.parse(calls[0].body!),
    { appointmentTypeID: 1, firstName: "A", lastName: "B", email: "a@b.com" },
  );
});

Deno.test("client: never sets Authorization (sign does)", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new AcuityClient(ctx).request("/calendars");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: builds requests against the documented base URL", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new AcuityClient(ctx).request("/calendars");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://acuityscheduling.com");
  assertEquals(url.pathname, "/api/v1/calendars");
});
