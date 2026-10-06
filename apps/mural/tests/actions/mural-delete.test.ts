import { assertEquals, assertRejects } from "@std/assert";
import muralDelete from "../../actions/mural-delete.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "muralId": "ws12345.1600" };

Deno.test("mural-delete: DELETE /murals/{muralId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await muralDelete.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/public/v1/murals/ws12345.1600");
  assertEquals(calls[0].url.startsWith("https://app.mural.co/api/public/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(out, { deleted: true, id: "ws12345.1600" });
});

Deno.test("mural-delete: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await muralDelete.execute(INPUT, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("mural-delete: a vendor error surfaces its own code and message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "TOKEN_EXPIRED", message: "Your token has expired." },
  }]);
  const err = await assertRejects(async () => await muralDelete.execute(INPUT, ctx)) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("TOKEN_EXPIRED"), true);
  assertEquals(err.message.includes("Your token has expired."), true);
});

Deno.test("mural-delete: an empty muralId is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () =>
    await muralDelete.execute({ ...INPUT, muralId: "  " as never }, ctx)
  );
  assertEquals(calls.length, 0);
});
