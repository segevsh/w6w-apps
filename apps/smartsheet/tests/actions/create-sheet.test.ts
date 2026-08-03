import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx, optionValues } from "../_helpers.ts";
import action from "../../actions/create-sheet.ts";

const columns = [
  { title: "Task", type: "TEXT_NUMBER", primary: true },
  { title: "Status", type: "PICKLIST", options: ["To Do", "Done"] },
];

Deno.test("create-sheet: is a non-idempotent perform", () => {
  assertEquals(action.key, "create-sheet");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});

Deno.test("create-sheet: a workspace id picks POST /workspaces/{id}/sheets", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { message: "SUCCESS" } }]);
  await action.execute({ name: "Plan", columns, workspaceId: "7960873114331012" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/2.0/workspaces/7960873114331012/sheets");
  assertEquals(JSON.parse(calls[0].body!), { name: "Plan", columns });
});

Deno.test("create-sheet: a folder id picks POST /folders/{id}/sheets", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ name: "Plan", columns, folderId: "4567890123" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/2.0/folders/4567890123/sheets");
});

Deno.test("create-sheet: a workspace id wins over a folder id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ name: "Plan", columns, workspaceId: "1", folderId: "2" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/2.0/workspaces/1/sheets");
});

Deno.test("create-sheet: neither id falls back to the deprecated POST /sheets, and says so", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ name: "Plan", columns }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/2.0/sheets");
  assert(/deprecated/i.test(action.description!));
});

Deno.test("create-sheet: a template id switches the body to fromId and enables include", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({
    name: "From template",
    columns,
    fromTemplateId: "8896508249565060",
    include: ["data", "forms"],
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "From template", fromId: 8896508249565060 });
  assertEquals(new URL(calls[0].url).searchParams.get("include"), "data,forms");
});

Deno.test("create-sheet: include is dropped when not creating from a template", async () => {
  // The API declares `include` on this operation only as "Additional parameter
  // to create a sheet from template" — sending it otherwise is meaningless.
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ name: "Plan", columns, include: ["data"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.has("include"), false);
});

Deno.test("create-sheet: offers exactly the 8 template include values the API declares", () => {
  assertEquals(optionValues(action, "include"), [
    "attachments",
    "cellLinks",
    "data",
    "discussions",
    "filters",
    "forms",
    "ruleRecipients",
    "rules",
  ]);
});

Deno.test("create-sheet: a template id that would round is refused, not silently corrupted", () => {
  const { ctx, calls } = mockCtx();
  assertThrows(
    () => action.execute({ name: "x", columns, fromTemplateId: "90071992547409911" }, ctx),
    Error,
    "safe integer",
  );
  // And it fails BEFORE anything reaches the network.
  assertEquals(calls.length, 0);
});
