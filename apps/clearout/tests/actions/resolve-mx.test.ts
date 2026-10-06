import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/resolve-mx.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("resolve-mx: POSTs the domain to /domain/resolve/mx and passes data through", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", data: { records: ["x"] } } }]);
  const out = await run(action, { domain: " example.com ", timeout: 5000 }, ctx);
  assertEquals(calls[0].url, "https://api.clearout.io/v2/domain/resolve/mx");
  assertEquals(JSON.parse(calls[0].body!), { domain: "example.com", timeout: 5000 });
  assertEquals(out.result, { records: ["x"] });
});

Deno.test("resolve-mx: blank domain throws without a request; 402 throws", async () => {
  const none = mockCtx();
  await assertRejects(() => run(action, { domain: "" }, none.ctx), Error, "domain is required");
  assertEquals(none.calls.length, 0);
  const poor = mockCtx([{
    status: 402,
    body: { status: "failed", error: { code: 1002, message: "x" } },
  }]);
  await assertRejects(() => run(action, { domain: "a.co" }, poor.ctx), Error, "credits");
});
