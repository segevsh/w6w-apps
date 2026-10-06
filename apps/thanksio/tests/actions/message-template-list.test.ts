import { assert, assertEquals, assertRejects } from "@std/assert";
import messageTemplateList from "../../actions/message-template-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("message-template-list: calls GET /api/v2/message-templates/ and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1 }]) }]);
  const out = await messageTemplateList.execute({ "subAccountId": 3 } as never, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/message-templates/");
  assertEquals(new URL(calls[0].url).origin, "https://api.thanks.io");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), { "sub_account_id": "3" });
  assertEquals(calls[0].body, null);
  assert((out.messageTemplates as unknown[]).length === 1, JSON.stringify(out));
});

Deno.test("message-template-list: a vendor error surfaces the HTTP status and message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { "message": "Unauthorized" } }]);
  const err = await assertRejects(
    () => Promise.resolve(messageTemplateList.execute({ "subAccountId": 3 } as never, ctx)),
    Error,
  );
  assert(err.message.includes("HTTP 403") && err.message.includes("Unauthorized"), err.message);
});
