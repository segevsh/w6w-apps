import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/person-profile-picture-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("person-profile-picture-get: sends the mapped query and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "tmp_profile_pic_url": "https://assets.enrichlayer.com/pp/a" },
  }]);
  const out = await action.execute!({
    "personProfileUrl": "https://www.linkedin.com/in/williamhgates/",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://enrichlayer.com/api/v2/person/profile-picture");
  assertEquals(Object.fromEntries(url.searchParams), {
    "person_profile_url": "https://www.linkedin.com/in/williamhgates/",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, { "pictureUrl": "https://assets.enrichlayer.com/pp/a" });
});

Deno.test("person-profile-picture-get: unset fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({} as never, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("person-profile-picture-get: a rejected key surfaces the vendor description", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: 401, description: "Invalid API key", name: "Unauthorized" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!(
        { "personProfileUrl": "https://www.linkedin.com/in/williamhgates/" },
        ctx,
      ),
    Error,
    "HTTP 401 — Invalid API key (Unauthorized)",
  );
});
