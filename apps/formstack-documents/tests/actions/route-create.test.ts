import { assert, assertEquals } from "@std/assert";
import { mockCtx, parse } from "../_helpers.ts";
import action from "../../actions/route-create.ts";

Deno.test("route-create: POSTs name and rules", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "234543", key: "abcdef" } }]);
  const out = await action.execute(
    {
      name: "New Employee Kit",
      rules: [{ document_id: "1234567", combine: 1 }],
      outputName: "Kit",
    } as never,
    ctx,
  ) as Record<string, unknown>;
  const call = calls[0];
  assertEquals(call.method, "POST");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/api/routes");
  assertEquals(JSON.parse(call.body!), {
    "name": "New Employee Kit",
    "rules": [{ "document_id": "1234567", "combine": 1 }],
    "output_name": "Kit",
  });
  assertEquals("folder" in JSON.parse(call.body!), false);
  assert(out !== null);
});

Deno.test("route-create: idempotent flag is false", () => {
  assertEquals(action.idempotent, false);
});

Deno.test("route-create: declares key, type and a description", () => {
  assertEquals(action.key, "route-create");
  assertEquals(action.type, "perform");
  assert(action.description!.length > 10);
});
