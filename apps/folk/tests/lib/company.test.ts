import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { buildCompanyBody } from "../../lib/company.ts";

test("buildCompanyBody: drops unset fields", () => {
  assertEquals(buildCompanyBody({ name: "Acme" }), { name: "Acme" });
});

test("buildCompanyBody: passes arrays through untouched", () => {
  const body = buildCompanyBody({ name: "Acme", urls: ["https://acme.example"] });
  assertEquals(body, { name: "Acme", urls: ["https://acme.example"] });
});
