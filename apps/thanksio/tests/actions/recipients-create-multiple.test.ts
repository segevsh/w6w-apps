import { assert, assertEquals, assertRejects } from "@std/assert";
import recipientsCreateMultiple from "../../actions/recipients-create-multiple.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("recipients-create-multiple: calls POST /api/v2/recipients-utils/create-multiple and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "name": "A" }, { "email": "b@x.io" }] }]);
  const out = await recipientsCreateMultiple.execute(
    {
      "recipients":
        '[{"mailing_list":1,"name":"A","address":"1 Main St"},{"mailing_list":1,"email":"b@x.io"}]',
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/recipients-utils/create-multiple");
  assertEquals(new URL(calls[0].url).origin, "https://api.thanks.io");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), [{
    "mailing_list": 1,
    "name": "A",
    "address": "1 Main St",
  }, { "mailing_list": 1, "email": "b@x.io" }]);
  assert((out.recipients as unknown[]).length === 2, JSON.stringify(out));
});

Deno.test("recipients-create-multiple: a vendor error surfaces the HTTP status and message", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { "message": "Mailing List Does Not Exist" } }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        recipientsCreateMultiple.execute(
          {
            "recipients":
              '[{"mailing_list":1,"name":"A","address":"1 Main St"},{"mailing_list":1,"email":"b@x.io"}]',
          } as never,
          ctx,
        ),
      ),
    Error,
  );
  assert(err.message.includes("HTTP 400") && err.message.includes("Does Not Exist"), err.message);
});

Deno.test("recipients-create-multiple: rejects an empty array", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(recipientsCreateMultiple.execute({ recipients: "[]" } as never, ctx)),
    Error,
    "non-empty",
  );
  assertEquals(calls.length, 0);
});
