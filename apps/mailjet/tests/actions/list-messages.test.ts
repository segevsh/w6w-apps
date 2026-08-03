import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import listMessages from "../../actions/list-messages.ts";

const ENVELOPE = { body: { Count: 1, Data: [{ ID: 1 }], Total: 1 } };

// ---------------------------------------------------------------- list-messages

Deno.test("list-messages: GETs /v3/REST/message", async () => {
  const { ctx, calls } = mockCtx([ENVELOPE]);
  await listMessages.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v3/REST/message");
});

Deno.test("list-messages: the Show* flags are opt-in and off by default", async () => {
  const { ctx, calls } = mockCtx([ENVELOPE]);
  await listMessages.execute!({}, ctx);
  const p = new URL(calls[0].url).searchParams;
  assert(!p.has("ShowSubject"));
  assert(!p.has("ShowCustomID"));
  assert(!p.has("ShowContactAlt"));
});

Deno.test("list-messages: forwards the Show* flags with Mailjet's exact casing", async () => {
  const { ctx, calls } = mockCtx([ENVELOPE]);
  await listMessages.execute!(
    { showSubject: true, showCustomId: true, showContactAlt: true },
    ctx,
  );
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("ShowSubject"), "true");
  // `ShowCustomID` — capital ID, unlike `ShowContactAlt`.
  assertEquals(p.get("ShowCustomID"), "true");
  assertEquals(p.get("ShowContactAlt"), "true");
});

Deno.test("list-messages: forwards time and type filters verbatim", async () => {
  const { ctx, calls } = mockCtx([ENVELOPE]);
  await listMessages.execute!(
    { fromTs: "2026-08-01T00:00:00Z", toTs: "1754006400", fromType: 1, customId: "order-42" },
    ctx,
  );
  const p = new URL(calls[0].url).searchParams;
  // Passed through unnormalised — both Unix and RFC3339 are valid to Mailjet.
  assertEquals(p.get("FromTS"), "2026-08-01T00:00:00Z");
  assertEquals(p.get("ToTS"), "1754006400");
  assertEquals(p.get("FromType"), "1");
  assertEquals(p.get("CustomID"), "order-42");
});
