import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/whatsapp-numbers-list.ts";
import { jsonBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("whatsapp-numbers-list: GET /whatsapp/whatsapp-activation/", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", data: [{ number: "9199" }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v5/whatsapp/whatsapp-activation/");
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(out, { numbers: [{ number: "9199" }] });
});

Deno.test("whatsapp-numbers-list: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].headers.authkey, undefined);
  assert(!calls[0].url.toLowerCase().includes("authkey"));
  assert(calls[0].url.startsWith("https://control.msg91.com/api/v5/"));
});

Deno.test("whatsapp-numbers-list: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ body: { type: "error", message: "Auth Key missing" } }]);
  const err = await assertRejects(async () => await action.execute({}, ctx)) as Error;
  assert(err.message.includes("Auth Key missing"));
});
