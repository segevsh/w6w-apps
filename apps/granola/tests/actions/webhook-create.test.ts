import { assertEquals, assertRejects } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-create: posts the body and returns the one-time signing secret", async () => {
  const created = { id: "whe_x", signing_secret: "whsec_abc", enabled: true };
  const { ctx, calls } = mockCtx([{ status: 201, body: created }]);
  const out = await webhookCreate.execute({
    url: "https://example.com/hook",
    scopes: ["personal", "public"],
    events: ["note.generated"],
    folderIds: "fol_a, fol_b\nfol_c",
  }, ctx);
  assertEquals(out, created);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/webhook-endpoints");
  assertEquals(JSON.parse(calls[0].body!), {
    url: "https://example.com/hook",
    scopes: ["personal", "public"],
    events: ["note.generated"],
    folder_ids: ["fol_a", "fol_b", "fol_c"],
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("webhook-create: empty events and folders are omitted, so the vendor defaults apply", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await webhookCreate.execute({
    url: "https://e.com/h",
    scopes: ["workspace"],
    events: [],
    folderIds: "",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { url: "https://e.com/h", scopes: ["workspace"] });
});

Deno.test("webhook-create: 404 (webhooks not enabled) is an error", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { code: "NOT_FOUND", message: "not available" } }]);
  await assertRejects(
    async () => await webhookCreate.execute({ url: "https://e.com/h", scopes: ["personal"] }, ctx),
    Error,
    "404",
  );
});

Deno.test("webhook-create: is not idempotent", () => {
  assertEquals(webhookCreate.idempotent, false);
});
