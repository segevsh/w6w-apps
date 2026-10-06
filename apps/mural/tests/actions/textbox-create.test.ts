import { assertEquals, assertRejects } from "@std/assert";
import textboxCreate from "../../actions/textbox-create.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "muralId": "ws12345.1600",
  "text": "hi",
  "x": 10,
  "y": 20,
  "style": '{"backgroundColor": "#FFE08AFF"}',
};

Deno.test("textbox-create: POST /murals/{muralId}/widgets/textbox", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { "value": [{ "id": "w9", "type": "sticky note" }] },
  }]);
  const out = await textboxCreate.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/public/v1/murals/ws12345.1600/widgets/textbox");
  assertEquals(calls[0].url.startsWith("https://app.mural.co/api/public/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), [{
    "text": "hi",
    "x": 10,
    "y": 20,
    "style": { "backgroundColor": "#FFE08AFF" },
  }]);
  assertEquals(out.id, "w9");
});

Deno.test("textbox-create: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { "value": [{ "id": "w9", "type": "sticky note" }] },
  }]);
  await textboxCreate.execute(INPUT, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("textbox-create: a vendor error surfaces its own code and message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "TOKEN_EXPIRED", message: "Your token has expired." },
  }]);
  const err = await assertRejects(async () => await textboxCreate.execute(INPUT, ctx)) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("TOKEN_EXPIRED"), true);
  assertEquals(err.message.includes("Your token has expired."), true);
});

Deno.test("textbox-create: an empty muralId is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () =>
    await textboxCreate.execute({ ...INPUT, muralId: "  " as never }, ctx)
  );
  assertEquals(calls.length, 0);
});
