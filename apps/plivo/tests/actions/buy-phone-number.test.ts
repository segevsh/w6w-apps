import { assertEquals, assertRejects } from "@std/assert";
import { BASE, CONN, json, mockCtx } from "../_helpers.ts";
import action from "../../actions/buy-phone-number.ts";

Deno.test("buy-phone-number: POSTs to PhoneNumber/{number}/ with only the set options", async () => {
  const body = {
    api_id: "a",
    message: "created",
    numbers: [{ number: "14155559186", status: "Success" }],
    status: "fulfilled",
  };
  const { ctx, calls } = mockCtx([{ status: 201, body }], CONN);
  const out = await action.execute!(
    { number: "14155559186", appId: "123", cnamLookup: "enabled", subaccount: "SA1" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, BASE + "PhoneNumber/14155559186/");
  assertEquals(json(calls[0]), { app_id: "123", cnam_lookup: "enabled", subaccount: "SA1" });
  assertEquals(out, body);
});

Deno.test("buy-phone-number: bare purchase sends an empty JSON object", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], CONN);
  await action.execute!({ number: "1" }, ctx);
  assertEquals(json(calls[0]), {});
});

Deno.test("buy-phone-number: compliance id is forwarded; blank number refused", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], CONN);
  await action.execute!({ number: "91", complianceApplicationId: "uuid-1" }, ctx);
  assertEquals(json(calls[0]), { compliance_application_id: "uuid-1" });
  await assertRejects(
    async () => await action.execute!({ number: " " }, mockCtx([], CONN).ctx),
    Error,
    "required",
  );
});

Deno.test("buy-phone-number: a 404 (subaccount credentials) is thrown", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "not found" }], CONN);
  await assertRejects(async () => await action.execute!({ number: "1" }, ctx), Error, "Plivo 404");
});
