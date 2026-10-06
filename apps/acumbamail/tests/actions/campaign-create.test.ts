import { assert, assertEquals, assertRejects } from "@std/assert";
import campaignCreate from "../../actions/campaign-create.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-create: POST /api/1/createCampaign/ with the documented form fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { sample: "ok" } }]);
  const out = await campaignCreate.execute({
    "name": "Autumn sale",
    "from_name": "Acme",
    "from_email": "news@example.com",
    "subject": "Hello",
    "content": "<p>Hi</p>",
    "lists": [7, "s12"],
    "date_send": "2026-12-01 10:00",
    "tracking_urls": false,
    "complete_json": true,
    "https": true,
  } as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/1/createCampaign/");
  assert(calls[0].url.startsWith("https://acumbamail.com/"));
  assertEquals(formOf(calls[0]), {
    "name": "Autumn sale",
    "from_name": "Acme",
    "from_email": "news@example.com",
    "subject": "Hello",
    "content": "<p>Hi</p>",
    "lists[0]": "7",
    "lists[1]": "s12",
    "date_send": "2026-12-01 10:00",
    "tracking_urls": "0",
    "complete_json": "1",
    "https": "1",
  });
  // the credential is stamped by `sign`, never by the action
  assert(!(calls[0].body ?? "").includes("auth_token"));
  assertEquals(out, { result: { sample: "ok" } });
});

Deno.test("campaign-create: a vendor error surfaces its status and body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: "Invalid argument" }]);
  const err = await assertRejects(async () =>
    await campaignCreate.execute({
      "name": "Autumn sale",
      "from_name": "Acme",
      "from_email": "news@example.com",
      "subject": "Hello",
      "content": "<p>Hi</p>",
      "lists": [7, "s12"],
      "date_send": "2026-12-01 10:00",
      "tracking_urls": false,
      "complete_json": true,
      "https": true,
    } as never, ctx)
  );
  assert(String((err as Error).message).includes("(400)"));
  assert(String((err as Error).message).includes("Invalid argument"));
});

Deno.test("campaign-create: an empty name fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await campaignCreate.execute({
        "name": "  ",
        "from_name": "Acme",
        "from_email": "news@example.com",
        "subject": "Hello",
        "content": "<p>Hi</p>",
        "lists": [7, "s12"],
        "date_send": "2026-12-01 10:00",
        "tracking_urls": false,
        "complete_json": true,
        "https": true,
      } as never, ctx),
    Error,
    "name is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("campaign-create: unset optional fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { sample: "ok" } }]);
  await campaignCreate.execute(
    {
      "name": "Autumn sale",
      "from_name": "Acme",
      "from_email": "news@example.com",
      "subject": "Hello",
      "content": "<p>Hi</p>",
      "lists": [7, "s12"],
    } as never,
    ctx,
  );
  assertEquals(formOf(calls[0]), {
    "name": "Autumn sale",
    "from_name": "Acme",
    "from_email": "news@example.com",
    "subject": "Hello",
    "content": "<p>Hi</p>",
    "lists[0]": "7",
    "lists[1]": "s12",
  });
});
