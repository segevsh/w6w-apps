import { assert, assertEquals } from "@std/assert";
import { mockCtx, parse } from "../_helpers.ts";
import action from "../../actions/document-delivery-list.ts";

Deno.test("document-delivery-list: GETs /documents/{id}/deliveries", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "261", type: "email", settings: {} }] }]);
  const out = await action.execute({ id: "436346" } as never, ctx) as Record<string, unknown>;
  const call = calls[0];
  assertEquals(call.method, "GET");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/api/documents/436346/deliveries");
  assertEquals(call.body, null);
  assert(out !== null);
});

Deno.test("document-delivery-list: declares key, type and a description", () => {
  assertEquals(action.key, "document-delivery-list");
  assertEquals(action.type, "read");
  assert(action.description!.length > 10);
});
