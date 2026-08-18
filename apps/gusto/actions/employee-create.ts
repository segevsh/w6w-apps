import type { ActionDefinition } from "@w6w/types";
import { compact, companyIdFrom, GustoClient } from "../lib/client.ts";
import { COMPANY_PARAM } from "../lib/params.ts";

/**
 * `POST /v1/companies/{company_id}/employees` — start an employee's onboarding.
 *
 * **This does not hire anyone.** It creates an employee record in the
 * *onboarding* state: no job, no compensation, no tax withholding, no bank
 * details. None of that can be set here, and until it is, the person cannot be
 * paid. The realistic workflow is that this call creates the record and Gusto's
 * own onboarding flow — or an administrator — completes it.
 *
 * Saying so matters because the action succeeds and returns a person who looks
 * created. A workflow that treats it as "hired" will find payroll running
 * without them.
 *
 * `self_onboarding` decides who fills in the rest: with it, Gusto emails the
 * employee and collects their own details, addresses and tax forms, which is
 * both less work and the only way to avoid the app handling somebody's Social
 * Security number.
 */
const action: ActionDefinition = {
  key: "employee-create",
  type: "perform",
  resource: "employee",
  title: "Create employee",
  description:
    "Create an employee record in ONBOARDING — no job, no compensation, no tax details, so " +
    "they cannot yet be paid. Self-onboarding lets Gusto collect the rest.",
  idempotent: false,
  params: [
    COMPANY_PARAM,
    { key: "firstName", label: "First Name", type: "string", required: true, default: "" },
    { key: "lastName", label: "Last Name", type: "string", required: true, default: "" },
    {
      key: "email",
      label: "Personal Email",
      type: "string",
      default: "",
      hint: "Where Gusto sends the self-onboarding invitation.",
    },
    {
      key: "workEmail",
      label: "Work Email",
      type: "string",
      default: "",
    },
    {
      key: "dateOfBirth",
      label: "Date of Birth",
      type: "date",
      default: "",
      advanced: true,
      hint: "`yyyy-mm-dd`. Required before the employee can be paid, but not to create them.",
    },
    {
      key: "selfOnboarding",
      label: "Self Onboarding",
      type: "boolean",
      default: true,
      hint: "On, Gusto emails the employee to collect their own address, tax withholding and " +
        "bank details — which also keeps their SSN out of this workflow.",
    },
  ],
  output: [
    { key: "uuid", type: "string", label: "Employee UUID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "onboarded", type: "boolean", label: "Onboarded" },
    { key: "onboarding_status", type: "string", label: "Onboarding status" },
    { key: "version", type: "string", label: "Version" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const companyId = companyIdFrom(ctx, p.companyId);
    const firstName = String(p.firstName ?? "").trim();
    const lastName = String(p.lastName ?? "").trim();
    if (!firstName || !lastName) throw new Error("`firstName` and `lastName` are both required");

    ctx.log("info", "creating a Gusto employee in onboarding", { companyId });
    return await new GustoClient(ctx).request(
      `/v1/companies/${encodeURIComponent(companyId)}/employees`,
      {
        method: "POST",
        body: compact({
          first_name: firstName,
          last_name: lastName,
          email: p.email,
          work_email: p.workEmail,
          date_of_birth: p.dateOfBirth,
          self_onboarding: p.selfOnboarding !== false,
        }),
      },
    );
  },
};

export default action;
