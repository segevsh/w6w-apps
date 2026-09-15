import { assertEquals } from "@std/assert";
import { mockMocoCtx } from "../_helpers.ts";
import action from "../../actions/project-create.ts";

Deno.test("project-create: POSTs /projects with the mapped body", async () => {
  const { ctx, calls } = mockMocoCtx([{ body: { id: 9, name: "Website Relaunch" } }]);
  const out = await action.execute({
    name: "Website Relaunch",
    companyId: 1233434,
    currency: "CHF",
    tags: "internal",
  }, ctx);
  assertEquals(calls[0].url, "https://acme.mocoapp.com/api/v1/projects");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "Website Relaunch");
  assertEquals(body.company_id, 1233434);
  assertEquals(body.currency, "CHF");
  assertEquals(body.tags, ["internal"]);
  assertEquals(out, { id: 9, name: "Website Relaunch" });
});

Deno.test("project-create: only name is required; other fields are omitted when unset", async () => {
  const { ctx, calls } = mockMocoCtx([{ body: { id: 9, name: "Website Relaunch" } }]);
  await action.execute({ name: "Website Relaunch" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { name: "Website Relaunch" });
});
