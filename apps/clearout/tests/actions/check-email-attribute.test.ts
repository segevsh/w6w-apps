import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/check-email-attribute.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("check-email-attribute: each check hits /email/verify/<check> (slash, not underscore)", async () => {
  for (const check of ["catchall", "disposable", "business", "free", "role", "gibberish"]) {
    const { ctx, calls } = mockCtx([{
      body: { status: "success", data: { email_address: "a@b.co", x: "yes" } },
    }]);
    const out = await run(action, { email: "a@b.co", check }, ctx);
    assertEquals(calls[0].url, `https://api.clearout.io/v2/email/verify/${check}`);
    assertEquals(JSON.parse(calls[0].body!), { email: "a@b.co" });
    assertEquals(out.check, check);
    assertEquals((out.result as { x: string }).x, "yes");
  }
});

Deno.test("check-email-attribute: an unknown check or blank email throws without a request", async () => {
  const none = mockCtx();
  await assertRejects(
    () => run(action, { email: "a@b.co", check: "spam" }, none.ctx),
    Error,
    "check must be one of",
  );
  await assertRejects(
    () => run(action, { email: "", check: "role" }, none.ctx),
    Error,
    "email is required",
  );
  assertEquals(none.calls.length, 0);
});

Deno.test("check-email-attribute: timeout is forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", data: {} } }]);
  await run(action, { email: "a@b.co", check: "free", timeout: 3000 }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { email: "a@b.co", timeout: 3000 });
});
