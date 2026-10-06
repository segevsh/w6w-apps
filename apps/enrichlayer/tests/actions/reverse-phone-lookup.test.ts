import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/reverse-phone-lookup.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("reverse-phone-lookup: sends the mapped query and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "linkedin_profile_url": "https://www.linkedin.com/in/a",
      "twitter_profile_url": null,
      "facebook_profile_url": "https://www.facebook.com/a",
    },
  }]);
  const out = await action.execute!({ "phoneNumber": "+14155552671" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://enrichlayer.com/api/v2/resolve/phone");
  assertEquals(Object.fromEntries(url.searchParams), { "phone_number": "+14155552671" });
  assertEquals(calls[0].body, null);
  assertEquals(out, {
    "linkedinProfileUrl": "https://www.linkedin.com/in/a",
    "twitterProfileUrl": null,
    "facebookProfileUrl": "https://www.facebook.com/a",
  });
});

Deno.test("reverse-phone-lookup: unset fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({} as never, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("reverse-phone-lookup: a rejected key surfaces the vendor description", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: 401, description: "Invalid API key", name: "Unauthorized" },
  }]);
  await assertRejects(
    async () => await action.execute!({ "phoneNumber": "+14155552671" }, ctx),
    Error,
    "HTTP 401 — Invalid API key (Unauthorized)",
  );
});
