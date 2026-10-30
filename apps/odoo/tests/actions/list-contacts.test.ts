import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import action from "../../actions/list-contacts.ts";
import { description, executeKwArgs, mockCtx } from "../_helpers.ts";

test("list-contacts: is a search action over res.partner", () => {
  assertEquals(action.key, "list-contacts");
  assertEquals(action.type, "search");
  assertEquals(action.resource, "res.partner");
});

test("list-contacts: search_read takes an EMPTY positional args, domain in kwargs", async () => {
  const { ctx, calls } = mockCtx([{ result: [{ id: 9, name: "Acme" }] }]);
  await action.execute(
    { domain: [["is_company", "=", true]], fields: "name,email", limit: 5 },
    ctx,
  );

  assertEquals(executeKwArgs(calls[0]), {
    model: "res.partner",
    method: "search_read",
    args: [],
    kwargs: { domain: [["is_company", "=", true]], fields: ["name", "email"], limit: 5 },
  });
});

test("list-contacts: an empty form sends only an empty domain", async () => {
  const { ctx, calls } = mockCtx([{ result: [] }]);
  await action.execute({}, ctx);
  assertEquals(executeKwArgs(calls[0]).kwargs, { domain: [] });
});

test("list-contacts: returns the records and their count", async () => {
  const records = [{ id: 9 }, { id: 15 }];
  const { ctx } = mockCtx([{ result: records }]);
  assertEquals(await action.execute({}, ctx), { records, count: 2 });
});

test("list-contacts: explains that companies and people share one model", () => {
  assert(/is_company/.test(description(action)));
});
