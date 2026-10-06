import { assert, assertEquals, assertRejects } from "@std/assert";
import subscriberAdd from "../../actions/subscriber-add.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscriber-add: POST /api/1/addSubscriber/ with the documented form fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { sample: "ok" } }]);
  const out = await subscriberAdd.execute(
    {
      "list_id": 7,
      "merge_fields": { "email": "a@b.co", "name": "Ann" },
      "double_optin": true,
      "update_subscriber": true,
      "complete_json": true,
    } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/1/addSubscriber/");
  assert(calls[0].url.startsWith("https://acumbamail.com/"));
  assertEquals(formOf(calls[0]), {
    "list_id": "7",
    "merge_fields[email]": "a@b.co",
    "merge_fields[name]": "Ann",
    "double_optin": "1",
    "update_subscriber": "1",
    "complete_json": "1",
  });
  // the credential is stamped by `sign`, never by the action
  assert(!(calls[0].body ?? "").includes("auth_token"));
  assertEquals(out, { result: { sample: "ok" } });
});

Deno.test("subscriber-add: a vendor error surfaces its status and body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: "Invalid argument" }]);
  const err = await assertRejects(async () =>
    await subscriberAdd.execute(
      {
        "list_id": 7,
        "merge_fields": { "email": "a@b.co", "name": "Ann" },
        "double_optin": true,
        "update_subscriber": true,
        "complete_json": true,
      } as never,
      ctx,
    )
  );
  assert(String((err as Error).message).includes("(400)"));
  assert(String((err as Error).message).includes("Invalid argument"));
});

Deno.test("subscriber-add: an empty list_id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await subscriberAdd.execute(
        {
          "list_id": "  ",
          "merge_fields": { "email": "a@b.co", "name": "Ann" },
          "double_optin": true,
          "update_subscriber": true,
          "complete_json": true,
        } as never,
        ctx,
      ),
    Error,
    "list_id is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("subscriber-add: unset optional fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { sample: "ok" } }]);
  await subscriberAdd.execute(
    { "list_id": 7, "merge_fields": { "email": "a@b.co", "name": "Ann" } } as never,
    ctx,
  );
  assertEquals(formOf(calls[0]), {
    "list_id": "7",
    "merge_fields[email]": "a@b.co",
    "merge_fields[name]": "Ann",
  });
});
