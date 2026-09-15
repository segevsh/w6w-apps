import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/client-update.ts";

const conn = { display: { baseUrl: "https://gotify.example.com" } };

Deno.test("client-update: PUTs /client/{id} with name", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 4, name: "Phone 2" } }], conn);
  await action.execute!({ id: 4, name: "Phone 2" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/client/4");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { name: "Phone 2" });
});

Deno.test(
  "client-update: leaving expiresAfterInactivitySeconds blank does not reset it — Gotify only " +
    "applies the field when present",
  async () => {
    const { ctx, calls } = mockCtx([{ status: 200, body: { id: 4, name: "Phone" } }], conn);
    await action.execute!({ id: 4, name: "Phone" }, ctx);
    const body = JSON.parse(calls[0].body!);
    assertEquals("expiresAfterInactivitySeconds" in body, false);
  },
);

Deno.test("client-update: sends expiresAfterInactivitySeconds when provided, including 0", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 4, name: "Phone" } }], conn);
  await action.execute!({ id: 4, name: "Phone", expiresAfterInactivitySeconds: 0 }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.expiresAfterInactivitySeconds, 0);
});
