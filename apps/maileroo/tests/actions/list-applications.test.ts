import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-applications.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("list-applications: drops smtp_password and sending_key from every row", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        applications: [{
          id: 10,
          name: "My App",
          smtp_username: "app10",
          smtp_password: "PW-SECRET",
          sending_key: "roo_SECRET",
          authorized_domain_count: 2,
          notes: "",
        }],
        total: 1,
        page: 1,
        per_page: 25,
        total_pages: 1,
      },
    },
  }]);
  const out = await run(action, {}, ctx);
  assertEquals(calls[0].url, "https://api.maileroo.com/v1/applications");
  assertEquals(out.applications, [{
    id: 10,
    name: "My App",
    smtp_username: "app10",
    authorized_domain_count: 2,
    notes: "",
  }]);
  assertEquals(JSON.stringify(out).includes("SECRET"), false);
});

Deno.test("list-applications: errors throw", async () => {
  await assertRejects(
    () => run(action, {}, mockCtx([{ status: 500, body: { error: { message: "boom" } } }]).ctx),
    Error,
    "boom",
  );
});
