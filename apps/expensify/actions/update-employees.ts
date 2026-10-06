import type { ActionDefinition } from "@w6w/types";
import { compact, emailAction, objectList, opts, requiredText, runJob } from "../lib/client.ts";

interface Input {
  employees: unknown;
  dryRun?: boolean;
  setEmployeePrimaryPolicy?: "none" | "new_employees" | "all_employees";
  shouldFixApprovalChains?: boolean;
  fixFirstLevelManagersOnly?: boolean;
  shouldSkipNotificationEmail?: boolean;
  notifyEmails?: string[] | string;
}

const POLICIES = ["none", "new_employees", "all_employees"];

/**
 * `update` / `employees` (entity `generic`) — the Advanced Employee Updater, `dataSource: request`.
 * The older "Employee updater" (CSV, `fileType`) is marked deprecated and no longer maintained by
 * Expensify and is not exposed. The `download` and `sftp` data sources need feed/SFTP credentials
 * inside the `credentials` object, which only the Auth `sign` hook may write, so they are not exposed.
 */
const updateEmployees: ActionDefinition<Input> = {
  key: "update-employees",
  type: "perform",
  resource: "employee",
  title: "Update Employees",
  description:
    "Provision and de-provision policy members from an employee feed: invite, set managers and roles, assign domain groups, remove terminated staff. Run with Dry run first.",
  idempotent: true,
  params: [
    {
      key: "employees",
      label: "Employees",
      type: "json",
      required: true,
      hint:
        "JSON array. Required per employee: employeeEmail, managerEmail, employeeID (stable external ID — a changed email for the same ID is treated as an address change), policyID. Optional: firstName, lastName, customField1, customField2, approvalLimit + overLimitApprover, approvesTo, role (user|auditor|admin), workerStatus, isTerminated, domainGroupID, additionalPolicyIDs, shouldRemoveFromUnassignedPolicies, defaultTags.",
    },
    {
      key: "dryRun",
      label: "Dry run",
      type: "boolean",
      default: true,
      hint: "Report what would change without changing anything.",
    },
    {
      key: "setEmployeePrimaryPolicy",
      label: "Set primary policy",
      type: "select",
      options: opts(POLICIES),
      hint: "Default none: never change an employee's primary policy.",
    },
    {
      key: "shouldFixApprovalChains",
      label: "Fix approval chains",
      type: "boolean",
      hint:
        "Invite managers (and their managers) to policies where they approve. Expensify default: true.",
    },
    {
      key: "fixFirstLevelManagersOnly",
      label: "First-level managers only",
      type: "boolean",
      hint: "With Fix approval chains: do not walk further up the chain.",
    },
    {
      key: "shouldSkipNotificationEmail",
      label: "Skip invitation emails",
      type: "boolean",
    },
    {
      key: "notifyEmails",
      label: "Email summary to",
      type: "array",
      item: { type: "string" },
      hint: "Receive a summary email of the changes made.",
    },
  ],
  output: [
    { key: "dryRun", type: "boolean", label: "Whether the job ran in dry-run mode" },
    { key: "updatedEmployeesCount", type: "number", label: "Employees updated (or that would be)" },
    { key: "diff", type: "object", label: "diffToAdd / diffToRemove: emails by policy ID" },
    { key: "securityGroupEmployeesMap", type: "object", label: "Domain group assignments" },
    { key: "skippedEmployees", type: "array", label: "Employees skipped, with reasons" },
  ],

  async execute(input, ctx) {
    const employees = objectList("employees", input.employees);
    employees.forEach((e, i) => {
      for (const f of ["employeeEmail", "managerEmail", "employeeID", "policyID"]) {
        requiredText(`employees[${i}].${f}`, e[f]);
      }
    });
    const primary = input.setEmployeePrimaryPolicy;
    if (primary !== undefined && !POLICIES.includes(primary)) {
      throw new Error(`setEmployeePrimaryPolicy must be one of ${POLICIES.join(", ")}`);
    }
    const dryRun = input.dryRun ?? true;
    const onFinish = emailAction(input.notifyEmails);
    const res = await runJob(ctx, {
      type: "update",
      "dry-run": dryRun,
      dataSource: "request",
      inputSettings: { type: "employees", entity: "generic" },
      ...compact({
        setEmployeePrimaryPolicy: primary,
        shouldFixApprovalChains: input.shouldFixApprovalChains,
        fixFirstLevelManagersOnly: input.fixFirstLevelManagersOnly,
        shouldSkipNotificationEmail: input.shouldSkipNotificationEmail,
      }),
      ...(onFinish ? { onFinish: [onFinish] } : {}),
    }, { data: JSON.stringify(employees) });
    return {
      dryRun: res["dry-run"] ?? dryRun,
      updatedEmployeesCount: res.updatedEmployeesCount,
      diff: res.diff ?? {},
      securityGroupEmployeesMap: res.securityGroupEmployeesMap ?? {},
      skippedEmployees: res.skippedEmployees ?? [],
    };
  },
};

export default updateEmployees;
