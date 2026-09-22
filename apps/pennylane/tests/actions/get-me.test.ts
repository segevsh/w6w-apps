import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-me.ts";

const ME = {
  user: {
    id: 12345,
    first_name: "John",
    last_name: "Doe",
    email: "jdoe@pennylane.com",
    locale: "fr",
  },
  company: { id: 123456, name: "Pennylane", reg_no: "123456789", accounting_logic: "french" },
  scopes: ["customers:all", "suppliers:all"],
};

Deno.test("get-me: GETs /me with no query and no body", async () => {
  const { ctx, calls } = mockCtx([{ body: ME }]);
  const res = await action.execute({}, ctx);

  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/external/v2/me");
  assertEquals(url.search, "");
  assertEquals(calls[0].body, null);
  assertEquals(res, ME);
});

Deno.test("get-me: declares no params at all — it needs no scope and takes no input", () => {
  assertEquals(action.params, []);
});
