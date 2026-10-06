import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/reverse-lookup-email.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("reverse-lookup-email: sends email_address and maps the lead (contructed_title typo fixed)", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: "success",
      data: {
        email_address: "a@x.com",
        lead: {
          id: "1",
          name: "A B",
          contructed_title: "CTO at X",
          title: "CTO",
          company_domain: "x.com",
          linkedin_url: "https://l/in/a",
          addresses: [{ city: "NYC" }],
        },
      },
    },
  }]);
  const out = await run(action, { email: "a@x.com" }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.clearout.io/v2/reverse_lookup/email?email_address=a%40x.com",
  );
  const lead = out.lead as Record<string, unknown>;
  assertEquals(lead.constructedTitle, "CTO at X");
  assertEquals(lead.companyDomain, "x.com");
  assertEquals(out.emailAddress, "a@x.com");
});

Deno.test("reverse-lookup-email: no lead gives null; blank email throws", async () => {
  const { ctx } = mockCtx([{ body: { status: "success", data: {} } }]);
  assertEquals((await run(action, { email: "a@x.com" }, ctx)).lead, null);
  await assertRejects(() => run(action, { email: "" }, mockCtx().ctx), Error, "email is required");
});
