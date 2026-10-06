import { assert, assertEquals, assertRejects } from "@std/assert";
import subscribersList from "../../actions/subscribers-list.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscribers-list: POST /api/1/getSubscribers/ with the documented form fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { sample: "ok" } }]);
  const out = await subscribersList.execute(
    {
      "list_id": 7,
      "status": 0,
      "block_index": 1,
      "all_fields": true,
      "complete_json": false,
    } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/1/getSubscribers/");
  assert(calls[0].url.startsWith("https://acumbamail.com/"));
  assertEquals(formOf(calls[0]), {
    "list_id": "7",
    "status": "0",
    "block_index": "1",
    "all_fields": "1",
    "complete_json": "0",
  });
  // the credential is stamped by `sign`, never by the action
  assert(!(calls[0].body ?? "").includes("auth_token"));
  assertEquals(out, { result: { sample: "ok" } });
});

Deno.test("subscribers-list: a vendor error surfaces its status and body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: "Invalid argument" }]);
  const err = await assertRejects(async () =>
    await subscribersList.execute(
      {
        "list_id": 7,
        "status": 0,
        "block_index": 1,
        "all_fields": true,
        "complete_json": false,
      } as never,
      ctx,
    )
  );
  assert(String((err as Error).message).includes("(400)"));
  assert(String((err as Error).message).includes("Invalid argument"));
});

Deno.test("subscribers-list: an empty list_id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await subscribersList.execute(
        {
          "list_id": "  ",
          "status": 0,
          "block_index": 1,
          "all_fields": true,
          "complete_json": false,
        } as never,
        ctx,
      ),
    Error,
    "list_id is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("subscribers-list: unset optional fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { sample: "ok" } }]);
  await subscribersList.execute({ "list_id": 7 } as never, ctx);
  assertEquals(formOf(calls[0]), { "list_id": "7" });
});
