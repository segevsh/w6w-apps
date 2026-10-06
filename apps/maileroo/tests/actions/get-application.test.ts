import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-application.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("get-application: maps the details and never returns the password or key", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        id: 10,
        name: "My App",
        smtp_username: "app10",
        smtp_password: "PW-SECRET",
        sending_key: "roo_SECRET",
        authorized_domains: [{ domain_id: 123, domain_name: "example.com" }],
        ip_allowlist: [{ ip_block: "203.0.113.0/24" }],
        local_part_list: ["hello"],
        allowed_recipient_domains: [],
        outbound_ips: [],
        notes: "n",
      },
    },
  }]);
  const out = await run(action, { applicationId: 10 }, ctx);
  assertEquals(calls[0].url, "https://api.maileroo.com/v1/applications/10");
  assertEquals(out.authorizedDomains[0].domain_name, "example.com");
  assertEquals(out.localPartList, ["hello"]);
  assertEquals(JSON.stringify(out).includes("SECRET"), false);
});

Deno.test("get-application: requires an id; 404 throws", async () => {
  await assertRejects(
    () => run(action, { applicationId: "" }, mockCtx().ctx),
    Error,
    "applicationId is required",
  );
  await assertRejects(
    () =>
      run(
        action,
        { applicationId: 1 },
        mockCtx([{ status: 404, body: { error: { message: "gone" } } }]).ctx,
      ),
    Error,
    "gone",
  );
});
