import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-get-many.ts";

Deno.test("project-get-many: GETs /projects with membership=true by default", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v4/projects");
  assertEquals(url.searchParams.get("membership"), "true");
});

Deno.test("project-get-many: forwards search and pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute({ membership: false, search: "api", perPage: 50, page: 2 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("membership"), "false");
  assertEquals(url.searchParams.get("search"), "api");
  assertEquals(url.searchParams.get("per_page"), "50");
  assertEquals(url.searchParams.get("page"), "2");
});
