import { assertEquals, assertRejects } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-create: POST /api/v1/webhook on the workspace host", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { webhook: { id: "w1", url: "https://h.test/x", status: "active", secret: "s3" } },
  }]);
  const out = await webhookCreate.execute({
    url: "https://h.test/x",
    enabledEvents: ["ai_note.generated"],
    scope: "workspace",
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).host, "acme.fellow.app");
  assertEquals(pathOf(calls[0].url), "/api/v1/webhook");
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign()");
  assertEquals(bodyOf(calls[0]), {
    url: "https://h.test/x",
    enabled_events: ["ai_note.generated"],
    scope: "workspace",
  });
  assertEquals((out as { secret: string }).secret, "s3");
});

Deno.test("webhook-create: a Fellow error surfaces its detail and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { detail: "Forbidden for this key" } }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        webhookCreate.execute({
          url: "https://h.test/x",
          enabledEvents: ["ai_note.generated"],
          scope: "workspace",
        }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("403"), true, err.message);
  assertEquals(err.message.includes("Forbidden for this key"), true, err.message);
});
