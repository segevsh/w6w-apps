import { assertEquals } from "@std/assert";
import action from "../../actions/update-dubbing-project.ts";
import { bodyOf, exec, failure, mockCtx } from "../_helpers.ts";

Deno.test("update-dubbing-project: PUTs target_locales to the project's update path", async () => {
  const reply = {
    project_id: "p/1",
    dubbing_type: "AUTOMATED",
    target_locales: ["fr_FR", "es_ES"],
  };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const out = await exec(action, { projectId: "p/1", targetLocales: "fr_FR, es_ES" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://api.murf.ai/v1/murfdub/projects/p%2F1/update");
  assertEquals(bodyOf(calls[0]), { target_locales: ["fr_FR", "es_ES"] });
  assertEquals(out, reply);
});

Deno.test("update-dubbing-project: validates input before calling", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(
    (await failure(action, { projectId: "", targetLocales: "a" }, ctx)).includes("projectId"),
    true,
  );
  assertEquals(
    (await failure(action, { projectId: "p", targetLocales: "" }, ctx)).includes("targetLocales"),
    true,
  );
  assertEquals(calls.length, 0);
});
