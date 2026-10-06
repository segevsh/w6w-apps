import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/interaction-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const ok = { id: "i1", credentialId: "c1", eventType: "credential_viewed", triggeredBy: "guest" };

Deno.test("interaction-create: POST /v1/credential-interactions with all four required fields", async () => {
  const { ctx, calls } = mockCtx([{ body: ok }]);
  await action.execute({
    credentialId: "c1",
    eventType: "credential_viewed",
    triggeredBy: "guest",
    triggeredAt: "2026-10-06T10:00:00.000Z",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/credential-interactions");
  assertEquals(JSON.parse(calls[0].body!), {
    credentialId: "c1",
    eventType: "credential_viewed",
    triggeredBy: "guest",
    triggeredAt: "2026-10-06T10:00:00.000Z",
  });
});

Deno.test("interaction-create: triggeredAt defaults to now as an ISO timestamp", async () => {
  const { ctx, calls } = mockCtx([{ body: ok }]);
  await action.execute({
    credentialId: "c1",
    eventType: "credential_downloaded",
    triggeredBy: "recipient",
  }, ctx);
  const at = JSON.parse(calls[0].body!).triggeredAt as string;
  assertEquals(new Date(at).toISOString(), at);
});

Deno.test("interaction-create: unknown event and actor are rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await action.execute({ credentialId: "c1", eventType: "nope", triggeredBy: "guest" }, ctx),
    Error,
    "documented events",
  );
  await assertRejects(
    async () =>
      await action.execute(
        { credentialId: "c1", eventType: "credential_viewed", triggeredBy: "bot" },
        ctx,
      ),
    Error,
    "recipient or guest",
  );
  assertEquals(calls.length, 0);
});
