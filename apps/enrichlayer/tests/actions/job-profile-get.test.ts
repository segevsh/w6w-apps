import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/job-profile-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("job-profile-get: sends the mapped query and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{ body: { "job_description": "x" } }]);
  const out = await action.execute!(
    { "url": "https://www.linkedin.com/jobs/view/4222036951/" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://enrichlayer.com/api/v2/job");
  assertEquals(Object.fromEntries(url.searchParams), {
    "url": "https://www.linkedin.com/jobs/view/4222036951/",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, { "job": { "job_description": "x" } });
});

Deno.test("job-profile-get: unset fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({} as never, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("job-profile-get: a rejected key surfaces the vendor description", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: 401, description: "Invalid API key", name: "Unauthorized" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({ "url": "https://www.linkedin.com/jobs/view/4222036951/" }, ctx),
    Error,
    "HTTP 401 — Invalid API key (Unauthorized)",
  );
});
