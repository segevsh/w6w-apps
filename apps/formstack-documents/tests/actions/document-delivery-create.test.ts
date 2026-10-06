import { assert, assertEquals } from "@std/assert";
import { mockCtx, parse } from "../_helpers.ts";
import action from "../../actions/document-delivery-create.ts";

Deno.test("document-delivery-create: POSTs type and settings", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "2344", success: 1 } }]);
  const out = await action.execute(
    {
      id: "436346",
      type: "email",
      settings: { to: "{$Email}", from: "test@example.com", subject: "Hi" },
    } as never,
    ctx,
  ) as Record<string, unknown>;
  const call = calls[0];
  assertEquals(call.method, "POST");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/api/documents/436346/deliveries");
  assertEquals(JSON.parse(call.body!), {
    "type": "email",
    "settings": { "to": "{$Email}", "from": "test@example.com", "subject": "Hi" },
  });
  assert(out !== null);
});

Deno.test("document-delivery-create: idempotent flag is false", () => {
  assertEquals(action.idempotent, false);
});

Deno.test("document-delivery-create: declares key, type and a description", () => {
  assertEquals(action.key, "document-delivery-create");
  assertEquals(action.type, "perform");
  assert(action.description!.length > 10);
});
