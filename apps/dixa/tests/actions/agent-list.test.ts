import { assert, assertEquals } from "@std/assert";
import agentList from "../../actions/agent-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("agent-list: calls GET /v1/agents", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": [{ "id": "11111111-2222-3333-4444-555555555555" }],
      "meta": { "next": "/v1/agents?pageKey=nx" },
    },
  }]);
  const out = await agentList.execute({ "email": "x@y.z", "pageLimit": 1 } as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).origin, "https://dev.dixa.io");
  assertEquals(pathOf(calls[0].url), "/v1/agents");
  assertEquals(queryOf(calls[0].url), { "email": "x@y.z", "pageLimit": "1" });
  // Credentials belong to `sign`; an action never sets them.
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, {
    data: [{ "id": "11111111-2222-3333-4444-555555555555" }],
    nextPageKey: "nx",
  });
});

Deno.test("agent-list: surfaces a Dixa error message with the status", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { message: "Invalid value for: body" } }]);
  let message = "";
  try {
    await agentList.execute({ "email": "x@y.z", "pageLimit": 1 } as never, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("Dixa 400"), message);
  assert(message.includes("Invalid value for: body"), message);
});

Deno.test("agent-list: rejects bad input before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await agentList.execute({ "email": "a@b.c", "phone": "+45" } as never, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("mutually exclusive"), message);
  assertEquals(calls.length, 0);
});
