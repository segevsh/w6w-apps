import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, OK, pathOf } from "../_helpers.ts";
import leadCreate from "../../actions/lead-create.ts";

Deno.test("lead-create: POST /leads with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  const out = await leadCreate.execute({
    email: "j@x.io",
    firstName: "J",
    tags: "!a, !b",
    phoneNumbers: "111",
    stage: "MQL",
    adOptimizationConsent: "GRANTED",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/api/v1.0/leads");
  assertEquals(JSON.parse(calls[0].body!), {
    email: "j@x.io",
    firstName: "J",
    tags: ["!a", "!b"],
    phoneNumbers: ["111"],
    stage: "MQL",
    adOptimizationConsent: "GRANTED",
  });
  assertEquals(out, { requestId: "req1", result: "OK" });
});

Deno.test("lead-create: needs an email or a phone, before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await leadCreate.execute({ firstName: "x" }, ctx),
    Error,
    "email or at least one phone",
  );
  assertEquals(calls.length, 0);
});

Deno.test("lead-create: a phone alone is enough", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await leadCreate.execute({ phoneNumbers: "123" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { phoneNumbers: ["123"] });
});
