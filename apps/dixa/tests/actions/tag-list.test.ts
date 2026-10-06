import { assert, assertEquals } from "@std/assert";
import tagList from "../../actions/tag-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tag-list: calls GET /v1/tags", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "data": [] } }]);
  const out = await tagList.execute({ "includeDeactivated": true } as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).origin, "https://dev.dixa.io");
  assertEquals(pathOf(calls[0].url), "/v1/tags");
  assertEquals(queryOf(calls[0].url), { "includeDeactivated": "true" });
  // Credentials belong to `sign`; an action never sets them.
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { "data": [] });
});

Deno.test("tag-list: surfaces a Dixa error message with the status", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { message: "Invalid value for: body" } }]);
  let message = "";
  try {
    await tagList.execute({ "includeDeactivated": true } as never, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("Dixa 400"), message);
  assert(message.includes("Invalid value for: body"), message);
});
