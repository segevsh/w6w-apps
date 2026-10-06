import { assert, assertEquals, assertRejects } from "@std/assert";
import tagRemove from "../../actions/tag-remove.ts";
import { bodyOf, errorEnvelope, mockCtx, okEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tag-remove: POSTs emailmarketing/removetag.json with the documented parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope([]) }]);
  const out = await tagRemove.execute(
    { "email": "jim@tester.com", "id": "3", "tagname": "vip" } as never,
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/1/emailmarketing/removetag.json");
  assertEquals(bodyOf(calls[0]), { "email": "jim@tester.com", "id": "3", "tagname": "vip" });
  // The credential is the Auth `sign` hook's job; the action never sets it.
  assertEquals(queryOf(calls[0].url)["key"], undefined);
  assertEquals(out, { "ok": true, "data": [] });
});

Deno.test("tag-remove: sends a form-encoded body, not a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope([]) }]);
  await tagRemove.execute({ "email": "jim@tester.com", "id": "3", "tagname": "vip" } as never, ctx);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("tag-remove: is declared idempotent", () => {
  assertEquals(tagRemove.idempotent, true);
});

Deno.test("tag-remove: an error envelope rejects with the vendor's message, whatever the status", async () => {
  for (const status of [200, 401]) {
    const { ctx } = mockCtx([{ status, body: errorEnvelope(1002, "bad thing") }]);
    const err = await assertRejects(async () =>
      await tagRemove.execute(
        { "email": "jim@tester.com", "id": "3", "tagname": "vip" } as never,
        ctx,
      )
    );
    assert((err as Error).message.includes("bad thing"));
  }
});
