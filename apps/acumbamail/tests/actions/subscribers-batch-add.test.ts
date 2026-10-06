import { assert, assertEquals, assertRejects } from "@std/assert";
import subscribersBatchAdd from "../../actions/subscribers-batch-add.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscribers-batch-add: POST /api/1/batchAddSubscribers/ with the documented form fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { sample: "ok" } }]);
  const out = await subscribersBatchAdd.execute(
    {
      "list_id": 7,
      "subscribers_data": [{ "email": "a@b.co" }, { "email": "c@d.co" }],
      "update_subscriber": true,
      "complete_json": false,
    } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/1/batchAddSubscribers/");
  assert(calls[0].url.startsWith("https://acumbamail.com/"));
  assertEquals(formOf(calls[0]), {
    "list_id": "7",
    "subscribers_data": '[{"email":"a@b.co"},{"email":"c@d.co"}]',
    "update_subscriber": "1",
    "complete_json": "0",
  });
  // the credential is stamped by `sign`, never by the action
  assert(!(calls[0].body ?? "").includes("auth_token"));
  assertEquals(out, { result: { sample: "ok" } });
});

Deno.test("subscribers-batch-add: a vendor error surfaces its status and body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: "Invalid argument" }]);
  const err = await assertRejects(async () =>
    await subscribersBatchAdd.execute(
      {
        "list_id": 7,
        "subscribers_data": [{ "email": "a@b.co" }, { "email": "c@d.co" }],
        "update_subscriber": true,
        "complete_json": false,
      } as never,
      ctx,
    )
  );
  assert(String((err as Error).message).includes("(400)"));
  assert(String((err as Error).message).includes("Invalid argument"));
});

Deno.test("subscribers-batch-add: an empty list_id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await subscribersBatchAdd.execute(
        {
          "list_id": "  ",
          "subscribers_data": [{ "email": "a@b.co" }, { "email": "c@d.co" }],
          "update_subscriber": true,
          "complete_json": false,
        } as never,
        ctx,
      ),
    Error,
    "list_id is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("subscribers-batch-add: unset optional fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { sample: "ok" } }]);
  await subscribersBatchAdd.execute(
    { "list_id": 7, "subscribers_data": [{ "email": "a@b.co" }, { "email": "c@d.co" }] } as never,
    ctx,
  );
  assertEquals(formOf(calls[0]), {
    "list_id": "7",
    "subscribers_data": '[{"email":"a@b.co"},{"email":"c@d.co"}]',
  });
});
