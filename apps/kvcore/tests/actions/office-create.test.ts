import { assertEquals } from "@std/assert";
import officeCreate from "../../actions/office-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("office-create: posts to /office", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, name: "HQ" } }]);
  await officeCreate.execute({ name: "HQ", status: true }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/public/office");
  assertEquals(JSON.parse(calls[0].body!), { name: "HQ", status: 1 });
});

Deno.test("office-create: only name is required", () => {
  const required = (officeCreate.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required, ["name"]);
});

Deno.test("office-create: docusign_office_id is offered (office/create-only field)", () => {
  const keys = (officeCreate.params ?? []).map((p) => p.key);
  assertEquals(keys.includes("docusign_office_id"), true);
  assertEquals(keys.includes("about_alt_french"), true);
});
