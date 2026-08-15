import { assertEquals } from "@std/assert";
import extensionGet from "../../actions/extension-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("extension-get: defaults both accountId and extensionId to ~", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1", name: "Alice", extensionNumber: "101" } }]);
  const out = await extensionGet.execute({}, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/restapi/v1.0/account/~/extension/~");
  assertEquals(out.name, "Alice");
});

Deno.test("extension-get: a real extensionId reads a different extension", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "222" } }]);
  await extensionGet.execute({ extensionId: "222" }, ctx);
  assertEquals(pathOf(calls[0].url), "/restapi/v1.0/account/~/extension/222");
});
