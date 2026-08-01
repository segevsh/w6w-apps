import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-jobs.ts";

const display = { endpoint: "https://ci.example.com" };

Deno.test("list-jobs: GETs /api/json?tree=jobs[...] at the instance root with no folder", async () => {
  const { ctx, calls } = mockCtx([
    { body: { jobs: [{ name: "job-a", url: "x", color: "blue", buildable: true }] } },
  ], { display });
  const result = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/json");
  assertEquals(url.searchParams.get("tree"), "jobs[name,url,color,buildable]");
  assertEquals(result, { jobs: [{ name: "job-a", url: "x", color: "blue", buildable: true }] });
});

Deno.test("list-jobs: narrows to /job/<folder>/api/json when a folder is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { jobs: [] } }], { display });
  await action.execute({ folder: "team/project" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/job/team/job/project/api/json");
  assertEquals(url.searchParams.get("tree"), "jobs[name,url,color,buildable]");
});

Deno.test("list-jobs: defaults to an empty array when the response has no jobs field", async () => {
  const { ctx } = mockCtx([{ body: {} }], { display });
  const result = await action.execute({}, ctx);
  assertEquals(result, { jobs: [] });
});
