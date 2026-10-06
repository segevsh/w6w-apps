import { assertEquals } from "@std/assert";
import action from "../../actions/qr-code-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("qr-code-create: POSTs /links/qr/{id} asking for JSON and defaults useDomainSettings", async () => {
  const { ctx, calls } = mockCtx([{ body: { url: "https://qr.example/x.png" } }]);
  const out = await action.execute({ linkId: "lnk_a_b", type: "svg" }, ctx);
  assertEquals(pathOf(calls[0].url), "/links/qr/lnk_a_b");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { useDomainSettings: true, type: "svg" });
  assertEquals(out.result, { url: "https://qr.example/x.png" });
});
