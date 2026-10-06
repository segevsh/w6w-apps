import { assert, assertEquals } from "@std/assert";
import tagCreate from "../../actions/tag-create.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tag-create: calls POST /v1/tags", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": { "id": "11111111-2222-3333-4444-555555555555", "name": "vip", "state": "Active" },
    },
  }]);
  const out = await tagCreate.execute({ "name": " vip ", "color": "#ff0000" } as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).origin, "https://dev.dixa.io");
  assertEquals(pathOf(calls[0].url), "/v1/tags");
  assertEquals(queryOf(calls[0].url), {});
  // Credentials belong to `sign`; an action never sets them.
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(calls[0].body!), { "name": "vip", "color": "#ff0000" });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(out, {
    "data": { "id": "11111111-2222-3333-4444-555555555555", "name": "vip", "state": "Active" },
  });
});

Deno.test("tag-create: surfaces a Dixa error message with the status", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { message: "Invalid value for: body" } }]);
  let message = "";
  try {
    await tagCreate.execute({ "name": " vip ", "color": "#ff0000" } as never, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("Dixa 400"), message);
  assert(message.includes("Invalid value for: body"), message);
});

Deno.test("tag-create: rejects bad input before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await tagCreate.execute({ "name": " " } as never, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("name is required"), message);
  assertEquals(calls.length, 0);
});
