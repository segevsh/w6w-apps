import { assertEquals, assertRejects } from "@std/assert";
import ticketGet from "../../actions/ticket-get.ts";
import { API_ROOT, envelope, mockCtx } from "../_helpers.ts";

Deno.test("ticket-get: GETs /tickets/{id} and returns the record", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7, name: "X" }) }]);
  const out = await ticketGet.execute({ id: 7 }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/tickets/7`);
  assertEquals(calls[0].body, null);
  assertEquals(out, { data: { id: 7, name: "X" } });
});

Deno.test("ticket-get: a non-JSON 200 (proxy page) is refused", async () => {
  const { ctx } = mockCtx([{
    headers: { "content-type": "text/html" },
    body: "<html>login</html>",
  }]);
  await assertRejects(async () => await ticketGet.execute({ id: 7 }, ctx), Error, "non-JSON");
});

Deno.test("ticket-get: a rejected key surfaces Upsales' plain-text Unauthorized", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  await assertRejects(async () => await ticketGet.execute({ id: 7 }, ctx), Error, "401");
});

Deno.test("ticket-get: a JSON error envelope surfaces the vendor key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "ThrottleLimit", code: 429, errorCode: 4, msg: "Too many requests" } },
  }]);
  await assertRejects(async () => await ticketGet.execute({ id: 7 }, ctx), Error, "ThrottleLimit");
});
