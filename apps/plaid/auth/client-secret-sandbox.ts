/**
 * The sandbox twin of `auth/client-secret.ts`.
 *
 * Plaid issues a **different secret per environment** against the same client
 * id, and sandbox data is entirely synthetic — no Item in one environment is
 * visible in the other. Sandbox is also the only place `sandbox-item-create`
 * works, which is what makes a Plaid workflow testable without a browser.
 *
 * It is a second auth method rather than a form field because the environment
 * decides the host, and a Connection belongs to exactly one — the same shape as
 * this pack's `docusign` and `gusto` apps.
 */
import { createPlaidAuth } from "./client-secret.ts";

export default createPlaidAuth("sandbox");
