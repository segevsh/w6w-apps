import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/reverse-lookup-linkedin.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("reverse-lookup-linkedin: sends url and maps the lead", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: "success",
      data: { lead: { name: "A B", company_name: "X", total_experience_in_months: 60 } },
    },
  }]);
  const out = await run(action, { url: "https://www.linkedin.com/in/ab" }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.clearout.io/v2/reverse_lookup/linkedin?url=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fab",
  );
  const lead = out.lead as Record<string, unknown>;
  assertEquals(lead.companyName, "X");
  assertEquals(lead.totalExperienceInMonths, 60);
});

Deno.test("reverse-lookup-linkedin: blank url throws; a 402 throws", async () => {
  await assertRejects(() => run(action, { url: " " }, mockCtx().ctx), Error, "url is required");
  const poor = mockCtx([{
    status: 402,
    body: { status: "failed", error: { code: 1002, message: "x" } },
  }]);
  await assertRejects(() => run(action, { url: "u" }, poor.ctx), Error, "credits");
});
