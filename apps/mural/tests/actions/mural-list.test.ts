import { assertEquals, assertRejects } from "@std/assert";
import muralList from "../../actions/mural-list.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "workspaceId": "ws12345",
  "status": "active",
  "sortBy": "lastModified",
  "limit": 10,
  "next": "tok1",
};

Deno.test("mural-list: GET /workspaces/{workspaceId}/murals", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "value": [{ "id": "a" }, { "id": "b" }], "next": "NXT" },
  }]);
  const out = await muralList.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/public/v1/workspaces/ws12345/murals");
  assertEquals(calls[0].url.startsWith("https://app.mural.co/api/public/v1/"), true);
  assertEquals(queryOf(calls[0].url), {
    "status": "active",
    "sortBy": "lastModified",
    "limit": "10",
    "next": "tok1",
  });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals((out.items as unknown[]).length, 2);
  assertEquals(out.next, "NXT");
});

Deno.test("mural-list: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "value": [{ "id": "a" }, { "id": "b" }], "next": "NXT" },
  }]);
  await muralList.execute(INPUT, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("mural-list: a vendor error surfaces its own code and message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "TOKEN_EXPIRED", message: "Your token has expired." },
  }]);
  const err = await assertRejects(async () => await muralList.execute(INPUT, ctx)) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("TOKEN_EXPIRED"), true);
  assertEquals(err.message.includes("Your token has expired."), true);
});

Deno.test("mural-list: an empty workspaceId is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () =>
    await muralList.execute({ ...INPUT, workspaceId: "  " as never }, ctx)
  );
  assertEquals(calls.length, 0);
});
