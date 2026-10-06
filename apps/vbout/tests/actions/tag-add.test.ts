import { assert, assertEquals, assertRejects } from "@std/assert";
import tagAdd from "../../actions/tag-add.ts";
import { bodyOf, errorEnvelope, mockCtx, okEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tag-add: POSTs emailmarketing/addtag.json with the documented parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope([]) }]);
  const out = await tagAdd.execute(
    { "email": "jim@tester.com", "id": "3", "tagname": "vip" } as never,
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/1/emailmarketing/addtag.json");
  assertEquals(bodyOf(calls[0]), { "email": "jim@tester.com", "id": "3", "tagname": "vip" });
  // The credential is the Auth `sign` hook's job; the action never sets it.
  assertEquals(queryOf(calls[0].url)["key"], undefined);
  assertEquals(out, { "ok": true, "data": [] });
});

Deno.test("tag-add: sends a form-encoded body, not a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope([]) }]);
  await tagAdd.execute({ "email": "jim@tester.com", "id": "3", "tagname": "vip" } as never, ctx);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("tag-add: is declared idempotent", () => {
  assertEquals(tagAdd.idempotent, true);
});

Deno.test("tag-add: an error envelope rejects with the vendor's message, whatever the status", async () => {
  for (const status of [200, 401]) {
    const { ctx } = mockCtx([{ status, body: errorEnvelope(1002, "bad thing") }]);
    const err = await assertRejects(async () =>
      await tagAdd.execute({ "email": "jim@tester.com", "id": "3", "tagname": "vip" } as never, ctx)
    );
    assert((err as Error).message.includes("bad thing"));
  }
});
