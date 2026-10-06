import { assertEquals } from "@std/assert";
import clientAdd from "../../actions/client-add.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client-add: POST /client/add with the mapped wire fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { RESULT: "success", data: { id: 1 } } }]);
  const out = await clientAdd.execute(
    { "name": "Acme", "domain": "acme.co", "statusId": 2 } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/external/client/add");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "name": "Acme",
    "domain": "acme.co",
    "status_id": 2,
  });
  assertEquals((out.data as { id: number }).id, 1);
});

Deno.test("client-add: a vendor error is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Invalid API key" } }]);
  let msg = "";
  try {
    await clientAdd.execute({ "name": "Acme", "domain": "acme.co", "statusId": 2 } as never, ctx);
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg.includes("HTTP 401") && msg.includes("Invalid API key"), true);
});
