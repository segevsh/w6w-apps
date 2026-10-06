import { assert, assertEquals } from "@std/assert";
import endUserCustomAttributesUpdate from "../../actions/end-user-custom-attributes-update.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("end-user-custom-attributes-update: calls PATCH /v1/endusers/11111111-2222-3333-4444-555555555555/custom-attributes", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "data": [] } }]);
  const out = await endUserCustomAttributesUpdate.execute(
    {
      "userId": "11111111-2222-3333-4444-555555555555",
      "attributes": '{"11111111-2222-3333-4444-555555555555":["a","b"]}',
    } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).origin, "https://dev.dixa.io");
  assertEquals(
    pathOf(calls[0].url),
    "/v1/endusers/11111111-2222-3333-4444-555555555555/custom-attributes",
  );
  assertEquals(queryOf(calls[0].url), {});
  // Credentials belong to `sign`; an action never sets them.
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(calls[0].body!), { "11111111-2222-3333-4444-555555555555": ["a", "b"] });
  assertEquals(out, { "data": [] });
});

Deno.test("end-user-custom-attributes-update: surfaces a Dixa error message with the status", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { message: "Invalid value for: body" } }]);
  let message = "";
  try {
    await endUserCustomAttributesUpdate.execute(
      {
        "userId": "11111111-2222-3333-4444-555555555555",
        "attributes": '{"11111111-2222-3333-4444-555555555555":["a","b"]}',
      } as never,
      ctx,
    );
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("Dixa 400"), message);
  assert(message.includes("Invalid value for: body"), message);
});

Deno.test("end-user-custom-attributes-update: rejects bad input before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await endUserCustomAttributesUpdate.execute(
      { "userId": "11111111-2222-3333-4444-555555555555", "attributes": {} } as never,
      ctx,
    );
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("must not be empty"), message);
  assertEquals(calls.length, 0);
});
