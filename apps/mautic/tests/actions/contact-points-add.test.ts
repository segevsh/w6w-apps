import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-points-add.ts";

const conn = { display: { baseUrl: "https://mautic.example.com" } };

test("contact-points-add: POSTs /contacts/{id}/points/plus/{points}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true } }], conn);
  const out = await action.execute!({ contactId: 1, points: 5, eventName: "Score via api" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://mautic.example.com/api/contacts/1/points/plus/5");
  assertEquals(JSON.parse(calls[0].body!), { eventName: "Score via api" });
  assertEquals(out, { success: true });
});

test("contact-points-add: is not idempotent — each call adds again", () => {
  assertEquals(action.idempotent, false);
});
