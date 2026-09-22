import { assertEquals } from "@std/assert";
import jobGet from "../../actions/job-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/**
 * `/job/get/{UUID}/` nests one level deeper than the lead read: the response is
 * an array of `{flag, data: <Job>}` wrappers.
 */
Deno.test("job-get: unwraps the {flag, data} wrapper around the job", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ flag: true, data: { UUID: "j1", Status: "Scheduled" } }],
  }]);
  const out = await jobGet.execute({ uuid: "j1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/job/get/j1/");
  assertEquals(out, { UUID: "j1", Status: "Scheduled" });
});

/** A flat row (the other reading of this vendor's shapes) must not crash either. */
Deno.test("job-get: a flat row passes through untouched", async () => {
  const { ctx } = mockCtx([{ body: [{ UUID: "j2", Status: "Done" }] }]);
  assertEquals(await jobGet.execute({ uuid: "j2" }, ctx), { UUID: "j2", Status: "Done" });
});

Deno.test("job-get: an empty answer is null", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  assertEquals(await jobGet.execute({ uuid: "nope" }, ctx), null);
});

Deno.test("job-get: escapes the UUID", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await jobGet.execute({ uuid: "a b" }, ctx);
  assertEquals(pathOf(calls[0].url), "/job/get/a%20b/");
});
