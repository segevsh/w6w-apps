import { assert, assertEquals } from "@std/assert";
import check from "../../health/service.ts";

Deno.test("service: declares the absence of a machine-readable status surface", () => {
  assertEquals(check.kind, "service");
  assert(check.unavailable?.reason);
  // `unavailable` and `check` are mutually exclusive — an absence has no hook.
  assertEquals(check.check, undefined);
});

Deno.test("service: is informational, or the declared absence pins the roll-up forever", () => {
  // An `unavailable` entry always reports `unknown`, which outranks `ok`.
  assertEquals(check.severity, "informational");
});

Deno.test("service: the reason states the evidence, not just the conclusion", () => {
  const reason = check.unavailable!.reason;
  // The finding that matters: every path returns the same HTML shell, so a
  // 200 from /api/v2/status.json proves nothing.
  assert(/status\.odoo\.com/.test(reason));
  assert(/HTML/i.test(reason));
  assert(/verified/i.test(reason));
  // And it points at the check that IS meaningful for this app.
  assert(/instance/.test(reason));
});

Deno.test("service: does not allowlist a status host it never calls", () => {
  assertEquals(check.network, undefined);
});
