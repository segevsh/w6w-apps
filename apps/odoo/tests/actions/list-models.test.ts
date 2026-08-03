import { assert, assertEquals } from "@std/assert";
import action from "../../actions/list-models.ts";
import { description, executeKwArgs, mockCtx, param } from "../_helpers.ts";

Deno.test("list-models: is a search action over ir.model", () => {
  assertEquals(action.key, "list-models");
  assertEquals(action.type, "search");
  assertEquals(action.resource, "ir.model");
});

Deno.test("list-models: search_reads ir.model, Odoo's registry of models", async () => {
  const { ctx, calls } = mockCtx([{ result: [{ id: 2327, model: "account.move" }] }]);
  await action.execute({ domain: [["model", "like", "sale"]], fields: "model,name" }, ctx);
  assertEquals(executeKwArgs(calls[0]), {
    model: "ir.model",
    method: "search_read",
    args: [],
    kwargs: { domain: [["model", "like", "sale"]], fields: ["model", "name"] },
  });
});

Deno.test("list-models: defaults to the two fields that are actually useful", () => {
  // `model` is the technical name other actions take; `name` is the label.
  assertEquals(param(action, "fields").default, "model,name");
});

Deno.test("list-models: explains that the model set is per-database", () => {
  assert(/installed apps/i.test(description(action)));
});
