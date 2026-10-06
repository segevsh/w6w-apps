import { assert, assertEquals, assertRejects } from "@std/assert";
import appGet from "../../actions/app-get.ts";
import { errorEnvelope, mockCtx, okEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("app-get: GETs app/me.json with the documented parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: okEnvelope({ "business": { "id": 12345, "businessName": "Loft Hotels" } }),
  }]);
  const out = await appGet.execute({} as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/1/app/me.json");
  assertEquals(queryOf(calls[0].url), {});
  // The credential is the Auth `sign` hook's job; the action never sets it.
  assertEquals(queryOf(calls[0].url)["key"], undefined);
  assertEquals(out, { "business": { "id": 12345, "businessName": "Loft Hotels" } });
});

Deno.test("app-get: is a read with no request body", async () => {
  const { ctx, calls } = mockCtx([{
    body: okEnvelope({ "business": { "id": 12345, "businessName": "Loft Hotels" } }),
  }]);
  await appGet.execute({} as never, ctx);
  assertEquals(calls[0].body, null);
  assertEquals(appGet.type, "read");
});

Deno.test("app-get: an error envelope rejects with the vendor's message, whatever the status", async () => {
  for (const status of [200, 401]) {
    const { ctx } = mockCtx([{ status, body: errorEnvelope(1002, "bad thing") }]);
    const err = await assertRejects(async () => await appGet.execute({} as never, ctx));
    assert((err as Error).message.includes("bad thing"));
  }
});
