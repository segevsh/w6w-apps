import { assertEquals, assertRejects } from "@std/assert";
import { AhrefsClient, buildQuery, country, errorLabel, errorText } from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("buildQuery: skips unset, null and empty values and encodes", () => {
  assertEquals(buildQuery({ a: "x y", b: undefined, c: null, d: "", e: 0 }), "?a=x+y&e=0");
  assertEquals(buildQuery(undefined), "");
});

Deno.test("country: lower-cases and drops blanks", () => {
  assertEquals(country(" US "), "us");
  assertEquals(country(""), undefined);
  assertEquals(country(undefined), undefined);
});

Deno.test("errorText/errorLabel: read the array form and the documented object form", () => {
  assertEquals(errorText(["Error", "Forbidden"]), "Error: Forbidden");
  assertEquals(errorLabel(["Error", "Unauthorized"]), "Unauthorized");
  assertEquals(errorText({ error: "bad target" }), "bad target");
  assertEquals(errorLabel({ error: "bad target" }), "bad target");
  assertEquals(errorLabel("<html>"), undefined);
  assertEquals(errorLabel(["Other"]), undefined);
  assertEquals(errorText(undefined, "  plain  "), "plain");
});

Deno.test("client.get: a non-JSON failure falls back to the raw text", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "bad gateway", headers: {} }]);
  await assertRejects(
    async () => await new AhrefsClient(ctx).get("/x"),
    Error,
    "HTTP 502 — bad gateway",
  );
});

Deno.test("client.report: an empty body is {} and bad cost headers are ignored", async () => {
  const { ctx } = mockCtx([{
    headers: { "x-api-rows": "abc", "x-api-units-cost-total-actual": "" },
  }]);
  assertEquals(await new AhrefsClient(ctx).report("/x"), {});
});
