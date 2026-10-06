import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/person-profile-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("person-profile-get: sends the mapped query and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "public_identifier": "satyanadella", "full_name": "Satya Nadella" },
  }]);
  const out = await action.execute!({
    "profileUrl": "https://www.linkedin.com/in/satyanadella",
    "personalEmail": "include",
    "useCache": "if-present",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://enrichlayer.com/api/v2/profile");
  assertEquals(Object.fromEntries(url.searchParams), {
    "profile_url": "https://www.linkedin.com/in/satyanadella",
    "personal_email": "include",
    "use_cache": "if-present",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, {
    "profile": { "public_identifier": "satyanadella", "full_name": "Satya Nadella" },
    "fullName": "Satya Nadella",
  });
});

Deno.test("person-profile-get: unset fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({} as never, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("person-profile-get: a rejected key surfaces the vendor description", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: 401, description: "Invalid API key", name: "Unauthorized" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "profileUrl": "https://www.linkedin.com/in/satyanadella",
        "personalEmail": "include",
        "useCache": "if-present",
      }, ctx),
    Error,
    "HTTP 401 — Invalid API key (Unauthorized)",
  );
});
