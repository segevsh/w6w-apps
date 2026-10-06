import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/person-role-lookup.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("person-role-lookup: sends the mapped query and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "linkedin_profile_url": "https://www.linkedin.com/in/satyanadella" },
  }]);
  const out = await action.execute!({ "role": "ceo", "companyName": "microsoft" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://enrichlayer.com/api/v2/find/company/role/");
  assertEquals(Object.fromEntries(url.searchParams), {
    "role": "ceo",
    "company_name": "microsoft",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, {
    "linkedinProfileUrl": "https://www.linkedin.com/in/satyanadella",
    "profile": null,
  });
});

Deno.test("person-role-lookup: unset fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({} as never, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("person-role-lookup: a rejected key surfaces the vendor description", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: 401, description: "Invalid API key", name: "Unauthorized" },
  }]);
  await assertRejects(
    async () => await action.execute!({ "role": "ceo", "companyName": "microsoft" }, ctx),
    Error,
    "HTTP 401 — Invalid API key (Unauthorized)",
  );
});
