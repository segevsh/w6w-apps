import { assert, assertEquals, assertRejects } from "@std/assert";
import listGet from "../../actions/list-get.ts";
import { errorEnvelope, mockCtx, okEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-get: GETs emailmarketing/getlist.json with the documented parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: okEnvelope({ "list": { "id": "524", "name": "Signup" } }),
  }]);
  const out = await listGet.execute({ "id": "3" } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/1/emailmarketing/getlist.json");
  assertEquals(queryOf(calls[0].url), { "id": "3" });
  // The credential is the Auth `sign` hook's job; the action never sets it.
  assertEquals(queryOf(calls[0].url)["key"], undefined);
  assertEquals(out, { "list": { "id": "524", "name": "Signup" } });
});

Deno.test("list-get: is a read with no request body", async () => {
  const { ctx, calls } = mockCtx([{
    body: okEnvelope({ "list": { "id": "524", "name": "Signup" } }),
  }]);
  await listGet.execute({ "id": "3" } as never, ctx);
  assertEquals(calls[0].body, null);
  assertEquals(listGet.type, "read");
});

Deno.test("list-get: an error envelope rejects with the vendor's message, whatever the status", async () => {
  for (const status of [200, 401]) {
    const { ctx } = mockCtx([{ status, body: errorEnvelope(1002, "bad thing") }]);
    const err = await assertRejects(async () => await listGet.execute({ "id": "3" } as never, ctx));
    assert((err as Error).message.includes("bad thing"));
  }
});
