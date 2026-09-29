import { assertEquals } from "@std/assert";
import officeUpdate from "../../actions/office-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("office-update: PUTs to /office/{id} without the id in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 4, email: "new@office.com" } }]);
  await officeUpdate.execute({ office_id: "4", email: "new@office.com" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/public/office/4");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { email: "new@office.com" });
  assertEquals("office_id" in body, false);
});

Deno.test("office-update: name is not required (unlike create)", () => {
  const required = (officeUpdate.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required, ["office_id"]);
});

Deno.test("office-update: docusign_office_id and about_alt_french are NOT offered on update", () => {
  const keys = (officeUpdate.params ?? []).map((p) => p.key);
  assertEquals(keys.includes("docusign_office_id"), false);
  assertEquals(keys.includes("about_alt_french"), false);
});
