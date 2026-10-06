import { assert, assertEquals, assertRejects } from "@std/assert";
import audienceList from "../../actions/audience-list.ts";
import { errorEnvelope, mockCtx, okEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("audience-list: GETs emailmarketing/getaudiences.json with the documented parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: okEnvelope({ "audiences": { "count": 1, "items": [{ "id": "148", "name": "NYC" }] } }),
  }]);
  const out = await audienceList.execute({} as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/1/emailmarketing/getaudiences.json");
  assertEquals(queryOf(calls[0].url), {});
  // The credential is the Auth `sign` hook's job; the action never sets it.
  assertEquals(queryOf(calls[0].url)["key"], undefined);
  assertEquals(out, { "audiences": { "count": 1, "items": [{ "id": "148", "name": "NYC" }] } });
});

Deno.test("audience-list: is a read with no request body", async () => {
  const { ctx, calls } = mockCtx([{
    body: okEnvelope({ "audiences": { "count": 1, "items": [{ "id": "148", "name": "NYC" }] } }),
  }]);
  await audienceList.execute({} as never, ctx);
  assertEquals(calls[0].body, null);
  assertEquals(audienceList.type, "read");
});

Deno.test("audience-list: an error envelope rejects with the vendor's message, whatever the status", async () => {
  for (const status of [200, 401]) {
    const { ctx } = mockCtx([{ status, body: errorEnvelope(1002, "bad thing") }]);
    const err = await assertRejects(async () => await audienceList.execute({} as never, ctx));
    assert((err as Error).message.includes("bad thing"));
  }
});
