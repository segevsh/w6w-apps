import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/optin-list.ts";

test("optin-list: reshapes the id-to-name map (unnamed entry is the default)", async () => {
  const { ctx, calls } = mockCtx([{ body: { "3": "", "23": "my-optin-process" } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://api.klicktipp.com/list");
  assertEquals(out, { optins: [{ id: "3", name: "" }, { id: "23", name: "my-optin-process" }] });
});

test("optin-list: detail mode carries both URLs", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "23": { name: "p", pendingurl: "https://a.example", thankyouurl: "https://b.example" },
    },
  }]);
  const out = await action.execute({ detail: true }, ctx);
  assertEquals(calls[0].url, "https://api.klicktipp.com/list?detail=true");
  assertEquals(out, {
    optins: [{
      id: "23",
      name: "p",
      pendingUrl: "https://a.example",
      thankYouUrl: "https://b.example",
    }],
  });
});
