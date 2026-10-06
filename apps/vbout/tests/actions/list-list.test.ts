import { assert, assertEquals, assertRejects } from "@std/assert";
import listList from "../../actions/list-list.ts";
import { errorEnvelope, mockCtx, okEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-list: GETs emailmarketing/getlists.json with the documented parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: okEnvelope({ "lists": { "count": 1, "items": [{ "id": "148", "name": "NYC" }] } }),
  }]);
  const out = await listList.execute({} as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/1/emailmarketing/getlists.json");
  assertEquals(queryOf(calls[0].url), {});
  // The credential is the Auth `sign` hook's job; the action never sets it.
  assertEquals(queryOf(calls[0].url)["key"], undefined);
  assertEquals(out, { "lists": { "count": 1, "items": [{ "id": "148", "name": "NYC" }] } });
});

Deno.test("list-list: is a read with no request body", async () => {
  const { ctx, calls } = mockCtx([{
    body: okEnvelope({ "lists": { "count": 1, "items": [{ "id": "148", "name": "NYC" }] } }),
  }]);
  await listList.execute({} as never, ctx);
  assertEquals(calls[0].body, null);
  assertEquals(listList.type, "read");
});

Deno.test("list-list: an error envelope rejects with the vendor's message, whatever the status", async () => {
  for (const status of [200, 401]) {
    const { ctx } = mockCtx([{ status, body: errorEnvelope(1002, "bad thing") }]);
    const err = await assertRejects(async () => await listList.execute({} as never, ctx));
    assert((err as Error).message.includes("bad thing"));
  }
});
