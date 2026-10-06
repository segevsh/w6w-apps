import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-domain.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("get-domain: maps DNS records, tracking flags and statistics", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        id: 123,
        domain_name: "example.com",
        dns_records: { spf_record: { created: true } },
        sandbox: false,
        free: false,
        interaction_tracking: true,
        custom_hostname_tracking: false,
        return_path: "bounces",
        status: true,
        statistics: { delivered: 100 },
      },
    },
  }]);
  const out = await run(action, { domainId: 123 }, ctx);
  assertEquals(calls[0].url, "https://api.maileroo.com/v1/domains/123");
  assertEquals(out.domainName, "example.com");
  assertEquals(out.dnsRecords, { spf_record: { created: true } });
  assertEquals([out.interactionTracking, out.returnPath, out.status], [true, "bounces", true]);
});

Deno.test("get-domain: needs an id; 404 throws", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: { message: "Domain not found" } } }]);
  await assertRejects(() => run(action, { domainId: "" }, ctx), Error, "domainId is required");
  await assertRejects(() => run(action, { domainId: 9 }, ctx), Error, "Domain not found");
});
