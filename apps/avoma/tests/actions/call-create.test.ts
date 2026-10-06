import { assertEquals, assertRejects } from "@std/assert";
import callCreate from "../../actions/call-create.ts";
import { detail, mockCtx, pathOf } from "../_helpers.ts";

const BASE = {
  externalId: "e1",
  userEmail: "rep@acme.com",
  frm: "+15550001",
  to: "+15550002",
  startAt: "2026-10-01T10:00:00Z",
  recordingUrl: "https://files.example/rec.mp3",
  direction: "Outbound",
  source: "twilio",
  participants: [{ email: "lead@x.com", name: "Lead" }],
};

Deno.test("call-create: POSTs the snake_case body and drops unset optionals", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { external_id: "e1" } }]);
  const out = await callCreate.execute({ ...BASE, answered: true }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/calls/");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    external_id: "e1",
    user_email: "rep@acme.com",
    frm: "+15550001",
    to: "+15550002",
    start_at: "2026-10-01T10:00:00Z",
    recording_url: "https://files.example/rec.mp3",
    direction: "Outbound",
    source: "twilio",
    participants: [{ email: "lead@x.com", name: "Lead" }],
    answered: true,
  });
  assertEquals(out, { external_id: "e1" });
});

Deno.test("call-create: participants may arrive as a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await callCreate.execute({ ...BASE, participants: '[{"email":"a@b.com"}]' }, ctx);
  assertEquals(JSON.parse(calls[0].body!).participants, [{ email: "a@b.com" }]);
});

Deno.test("call-create: empty or malformed participants are refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await callCreate.execute({ ...BASE, participants: [] }, ctx),
    Error,
    "non-empty",
  );
  await assertRejects(
    async () => await callCreate.execute({ ...BASE, participants: "{nope" }, ctx),
    Error,
    "not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("call-create: a 400 is reported and the action is not marked idempotent", async () => {
  const { ctx } = mockCtx([{ status: 400, body: detail("external_id already exists") }]);
  await assertRejects(
    async () => await callCreate.execute(BASE, ctx),
    Error,
    "400: external_id already exists",
  );
  assertEquals(callCreate.idempotent, false);
});
