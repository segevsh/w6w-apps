import { assertEquals, assertRejects } from "@std/assert";
import { mockPeopleCtx } from "../_helpers.ts";
import action from "../../actions/projects-list.ts";

Deno.test("projects-list: GETs getprojects with filters", async () => {
  const { ctx, calls } = mockPeopleCtx([{
    body: { response: { result: [{ projectId: "9" }], status: 0 } },
  }]);
  const out = await action.execute({
    clientId: "5",
    projectStatus: "inprogress",
    assignedTo: "all",
  }, ctx) as { result: unknown[] };
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/people/api/timetracker/getprojects");
  assertEquals(url.searchParams.get("clientId"), "5");
  assertEquals(url.searchParams.get("projectStatus"), "inprogress");
  assertEquals(out.result.length, 1);
});

Deno.test("projects-list: no params means a bare request; bad limit rejected", async () => {
  const { ctx, calls } = mockPeopleCtx([{ body: { response: { result: [], status: 0 } } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  await assertRejects(
    () => action.execute({ limit: 0 }, ctx) as Promise<unknown>,
    Error,
    "between 1 and 200",
  );
});
