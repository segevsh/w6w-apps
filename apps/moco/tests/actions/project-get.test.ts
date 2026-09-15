import { assertEquals } from "@std/assert";
import { mockMocoCtx } from "../_helpers.ts";
import action from "../../actions/project-get.ts";

Deno.test("project-get: GETs /projects/:id", async () => {
  const { ctx, calls } = mockMocoCtx([{ body: { id: 7, name: "Website Relaunch", active: true } }]);
  const out = await action.execute({ projectId: 7 }, ctx);
  assertEquals(calls[0].url, "https://acme.mocoapp.com/api/v1/projects/7");
  assertEquals(out, { id: 7, name: "Website Relaunch", active: true });
});
