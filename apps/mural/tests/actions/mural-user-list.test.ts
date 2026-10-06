import { assertEquals, assertRejects } from "@std/assert";
import muralUserList from "../../actions/mural-user-list.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "muralId": "ws12345.1600", "limit": 10, "next": "tok1" };

Deno.test("mural-user-list: GET /murals/{muralId}/users", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "value": [{ "id": "a" }, { "id": "b" }], "next": "NXT" },
  }]);
  const out = await muralUserList.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/public/v1/murals/ws12345.1600/users");
  assertEquals(calls[0].url.startsWith("https://app.mural.co/api/public/v1/"), true);
  assertEquals(queryOf(calls[0].url), { "limit": "10", "next": "tok1" });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals((out.items as unknown[]).length, 2);
  assertEquals(out.next, "NXT");
});

Deno.test("mural-user-list: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "value": [{ "id": "a" }, { "id": "b" }], "next": "NXT" },
  }]);
  await muralUserList.execute(INPUT, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("mural-user-list: a vendor error surfaces its own code and message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "TOKEN_EXPIRED", message: "Your token has expired." },
  }]);
  const err = await assertRejects(async () => await muralUserList.execute(INPUT, ctx)) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("TOKEN_EXPIRED"), true);
  assertEquals(err.message.includes("Your token has expired."), true);
});

Deno.test("mural-user-list: an empty muralId is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () =>
    await muralUserList.execute({ ...INPUT, muralId: "  " as never }, ctx)
  );
  assertEquals(calls.length, 0);
});
