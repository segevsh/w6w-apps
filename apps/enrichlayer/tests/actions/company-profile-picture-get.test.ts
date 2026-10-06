import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/company-profile-picture-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("company-profile-picture-get: sends the mapped query and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "tmp_profile_pic_url": "https://assets.enrichlayer.com/pp/b" },
  }]);
  const out = await action.execute!({
    "companyProfileUrl": "https://www.linkedin.com/company/apple/",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://enrichlayer.com/api/v2/company/profile-picture");
  assertEquals(Object.fromEntries(url.searchParams), {
    "company_profile_url": "https://www.linkedin.com/company/apple/",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, { "pictureUrl": "https://assets.enrichlayer.com/pp/b" });
});

Deno.test("company-profile-picture-get: unset fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({} as never, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("company-profile-picture-get: a rejected key surfaces the vendor description", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: 401, description: "Invalid API key", name: "Unauthorized" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!(
        { "companyProfileUrl": "https://www.linkedin.com/company/apple/" },
        ctx,
      ),
    Error,
    "HTTP 401 — Invalid API key (Unauthorized)",
  );
});
