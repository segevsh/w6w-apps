import { assert, assertEquals, assertRejects } from "@std/assert";
import eventTrack from "../../actions/event-track.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const run = (ctx: Parameters<typeof eventTrack.execute>[1], input: Record<string, unknown>) =>
  eventTrack.execute(input as never, ctx) as Promise<unknown>;

Deno.test("event-track: declares a non-idempotent perform action", () => {
  assertEquals(eventTrack.key, "event-track");
  assertEquals(eventTrack.type, "perform");
  assertEquals(eventTrack.idempotent, false);
  assert((eventTrack.description ?? "").length > 0);
  assert(Array.isArray(eventTrack.output) && eventTrack.output.length > 0);
});

Deno.test("event-track: POSTs to the ingest host with name, user and properties", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: 1 } }]);
  await run(ctx, {
    name: "Registered user",
    email: " jon@x.com ",
    userId: "1",
    firstName: "Jon",
    tags: "a, b",
    userFields: '{"plan":"Premium"}',
    properties: '{"trial":{"length":14}}',
    sourceIp: "1.2.3.4",
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://ingest.encharge.io/v1/");
  assertEquals(pathOf(calls[0].url), "/v1/");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Registered user",
    user: { plan: "Premium", email: "jon@x.com", userId: "1", firstName: "Jon", tags: "a, b" },
    properties: { trial: { length: 14 } },
    sourceIp: "1.2.3.4",
  });
  assertEquals(calls[0].headers["x-encharge-token"], undefined);
});

Deno.test("event-track: an empty ingest response is ok; needs a name and an identifier", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "", headers: {} }]);
  assertEquals(await run(ctx, { name: "identify", userId: "9" }), { ok: true });
  assertEquals(JSON.parse(calls[0].body!), { name: "identify", user: { userId: "9" } });
  const none = mockCtx([]);
  await assertRejects(() => run(none.ctx, { userId: "9" }), Error, "`name`");
  await assertRejects(() => run(none.ctx, { name: "x" }), Error, "email");
  await assertRejects(
    () => run(none.ctx, { name: "x", email: "a@x.com", userFields: "[]" }),
    Error,
    "JSON object",
  );
  assertEquals(none.calls.length, 0);
});

Deno.test("event-track: the Ingest API's plain-string error is thrown", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: "Can't find this account." } }]);
  await assertRejects(
    () => run(ctx, { name: "x", email: "a@x.com" }),
    Error,
    "Can't find this account",
  );
});
