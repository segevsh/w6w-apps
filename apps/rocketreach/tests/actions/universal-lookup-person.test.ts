import { assertEquals, assertRejects } from "@std/assert";
import lookup from "../../actions/universal-lookup-person.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("universal-lookup-person: sends only the reveal flags that were set", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      id: 8,
      status: "complete",
      current_work_email: "a@b.co",
      recommended_professional_email: "a@b.co",
    },
  }]);
  const out = await run(lookup, {
    email: "a@b.co",
    reveal_professional_email: true,
    reveal_phone: false,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/universal/person/lookup");
  assertEquals(url.searchParams.get("reveal_professional_email"), "true");
  assertEquals(url.searchParams.get("reveal_phone"), "false");
  assertEquals(url.searchParams.has("reveal_personal_email"), false);
  assertEquals([out.complete, out.recommendedProfessionalEmail], [true, "a@b.co"]);
});

Deno.test("universal-lookup-person: declares five reveal flags, all off by default", () => {
  const flags = lookup.params!.filter((p) => p.key.startsWith("reveal_"));
  assertEquals(flags.length, 5);
  for (const f of flags) assertEquals(f.default, false);
});

Deno.test("universal-lookup-person: unidentified input is refused; 403 throws", async () => {
  await assertRejects(() => run(lookup, {}, mockCtx().ctx), Error, "Identify the person");
  const bad = mockCtx([{ status: 403, body: { detail: "not universal" } }]);
  await assertRejects(() => run(lookup, { id: 1 }, bad.ctx), Error, "not universal");
});
