import { assert, assertEquals } from "@std/assert";
import { mockCtx, optionValues, param } from "../_helpers.ts";
import action from "../../actions/list-container-children.ts";

const ok = () => mockCtx([{ status: 200, body: { data: [] } }]);

Deno.test("list-container-children: is a read requiring a container and an id", () => {
  assertEquals(action.key, "list-container-children");
  assertEquals(action.type, "read");
  assertEquals(param(action, "container").required, true);
  assertEquals(param(action, "containerId").required, true);
  assertEquals(param(action, "container").default, "workspace");
});

Deno.test("list-container-children: a workspace goes to /workspaces/{id}/children", async () => {
  const { ctx, calls } = ok();
  await action.execute({ container: "workspace", containerId: "7960873114331012" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/2.0/workspaces/7960873114331012/children");
});

Deno.test("list-container-children: a folder goes to /folders/{id}/children", async () => {
  const { ctx, calls } = ok();
  await action.execute({ container: "folder", containerId: "4567890123" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/2.0/folders/4567890123/children");
});

Deno.test("list-container-children: offers the five child resource types the API declares", () => {
  assertEquals(optionValues(action, "childrenResourceTypes"), [
    "sheets",
    "reports",
    "sights",
    "folders",
    "templates",
  ]);
});

Deno.test("list-container-children: sends the type and include lists as single csv params", async () => {
  const { ctx, calls } = ok();
  await action.execute({
    container: "workspace",
    containerId: "1",
    childrenResourceTypes: ["folders", "sheets"],
    include: ["ownerInfo"],
    maxItems: 200,
    lastKey: "k",
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("childrenResourceTypes"), "folders,sheets");
  assertEquals(q.get("include"), "ownerInfo");
  assertEquals(q.get("maxItems"), "200");
  assertEquals(q.get("lastKey"), "k");
});

Deno.test("list-container-children: repeats the templates-needs-sheets rule at the form", () => {
  assert(/templates/.test(param(action, "childrenResourceTypes").hint ?? ""));
  assert(/sheets/.test(param(action, "childrenResourceTypes").hint ?? ""));
});

Deno.test("list-container-children: is documented as the way to list folders", () => {
  // There is no GET /folders and no GET /folders/{id} in the current API.
  assert(/folders/i.test(action.description!));
  assert(/no standalone list-folders endpoint/i.test(action.description!));
});
