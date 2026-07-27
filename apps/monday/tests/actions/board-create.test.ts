import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/board-create.ts";

const OK = { data: { create_board: { id: "b1", name: "Roadmap", board_kind: "public" } } };

Deno.test("board-create: sends CreateBoard with name and kind", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ name: "Roadmap", kind: "public" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("create_board"), true);
  assertEquals(sent.variables, { name: "Roadmap", kind: "public" });
});

Deno.test("board-create: forwards optional template and workspace ids", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ name: "x", kind: "private", templateId: "t1", workspaceId: "w1" }, ctx);
  const vars = JSON.parse(calls[0].body!).variables;
  assertEquals(vars.templateId, "t1");
  assertEquals(vars.workspaceId, "w1");
});

Deno.test("board-create: is not idempotent (each call mints a new board)", () => {
  assertEquals(action.idempotent, false);
});
