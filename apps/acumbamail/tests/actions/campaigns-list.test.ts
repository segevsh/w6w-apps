import { assert, assertEquals, assertRejects } from "@std/assert";
import campaignsList from "../../actions/campaigns-list.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaigns-list: POST /api/1/getCampaigns/ with the documented form fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { sample: "ok" } }]);
  const out = await campaignsList.execute(
    {
      "complete_json": true,
      "start_date": "2026-01-01",
      "end_date": "31/01/2026 23:59",
      "date_field": "sent",
      "status": "Sent",
    } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/1/getCampaigns/");
  assert(calls[0].url.startsWith("https://acumbamail.com/"));
  assertEquals(formOf(calls[0]), {
    "complete_json": "1",
    "start_date": "2026-01-01",
    "end_date": "31/01/2026 23:59",
    "date_field": "sent",
    "status": "Sent",
  });
  // the credential is stamped by `sign`, never by the action
  assert(!(calls[0].body ?? "").includes("auth_token"));
  assertEquals(out, { result: { sample: "ok" } });
});

Deno.test("campaigns-list: a vendor error surfaces its status and body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: "Invalid argument" }]);
  const err = await assertRejects(async () =>
    await campaignsList.execute(
      {
        "complete_json": true,
        "start_date": "2026-01-01",
        "end_date": "31/01/2026 23:59",
        "date_field": "sent",
        "status": "Sent",
      } as never,
      ctx,
    )
  );
  assert(String((err as Error).message).includes("(400)"));
  assert(String((err as Error).message).includes("Invalid argument"));
});

Deno.test("campaigns-list: unset optional fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { sample: "ok" } }]);
  await campaignsList.execute({} as never, ctx);
  assertEquals(formOf(calls[0]), {});
});
