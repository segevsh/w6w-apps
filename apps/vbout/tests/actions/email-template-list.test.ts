import { assert, assertEquals, assertRejects } from "@std/assert";
import emailTemplateList from "../../actions/email-template-list.ts";
import { errorEnvelope, mockCtx, okEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("email-template-list: GETs emailmarketing/getemailtemplates.json with the documented parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope({ "templates": {} }) }]);
  const out = await emailTemplateList.execute({} as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/1/emailmarketing/getemailtemplates.json");
  assertEquals(queryOf(calls[0].url), {});
  // The credential is the Auth `sign` hook's job; the action never sets it.
  assertEquals(queryOf(calls[0].url)["key"], undefined);
  assertEquals(out, { "templates": {} });
});

Deno.test("email-template-list: is a read with no request body", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope({ "templates": {} }) }]);
  await emailTemplateList.execute({} as never, ctx);
  assertEquals(calls[0].body, null);
  assertEquals(emailTemplateList.type, "read");
});

Deno.test("email-template-list: an error envelope rejects with the vendor's message, whatever the status", async () => {
  for (const status of [200, 401]) {
    const { ctx } = mockCtx([{ status, body: errorEnvelope(1002, "bad thing") }]);
    const err = await assertRejects(async () => await emailTemplateList.execute({} as never, ctx));
    assert((err as Error).message.includes("bad thing"));
  }
});
