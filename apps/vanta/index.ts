/**
 * Vanta — read a compliance program: failing tests and the resources causing
 * them, controls and their owners, issues against their due dates,
 * vulnerabilities against their SLAs, people's overdue tasks, and the vendor
 * inventory.
 *
 * See `lib/client.ts` for the API's shape and `auth/client-credentials.ts` for
 * the constraint that shapes everything — Vanta allows **one active token per
 * application**, and minting a second silently revokes the first.
 */
import type { AppDefinition } from "@w6w/types";

import clientCredentials from "./auth/client-credentials.ts";

import service from "./health/service.ts";
import tenant from "./health/tenant.ts";
import quota from "./health/quota.ts";

import testList from "./actions/test-list.ts";
import testGet from "./actions/test-get.ts";
import testEntityList from "./actions/test-entity-list.ts";
import testEntityDeactivate from "./actions/test-entity-deactivate.ts";
import controlList from "./actions/control-list.ts";
import controlGet from "./actions/control-get.ts";
import controlSetOwner from "./actions/control-set-owner.ts";
import frameworkList from "./actions/framework-list.ts";
import frameworkControlList from "./actions/framework-control-list.ts";
import documentList from "./actions/document-list.ts";
import policyList from "./actions/policy-list.ts";
import issueList from "./actions/issue-list.ts";
import issueGet from "./actions/issue-get.ts";
import riskScenarioList from "./actions/risk-scenario-list.ts";
import vulnerabilityList from "./actions/vulnerability-list.ts";
import vulnerabilityGet from "./actions/vulnerability-get.ts";
import vulnerabilityRemediationList from "./actions/vulnerability-remediation-list.ts";
import personList from "./actions/person-list.ts";
import personOffboard from "./actions/person-offboard.ts";
import userList from "./actions/user-list.ts";
import vendorList from "./actions/vendor-list.ts";
import vendorGet from "./actions/vendor-get.ts";
import integrationList from "./actions/integration-list.ts";
import monitoredComputerList from "./actions/monitored-computer-list.ts";
import eventLogList from "./actions/event-log-list.ts";

const app: AppDefinition = {
  actions: [
    testList,
    testGet,
    testEntityList,
    testEntityDeactivate,
    controlList,
    controlGet,
    controlSetOwner,
    frameworkList,
    frameworkControlList,
    documentList,
    policyList,
    issueList,
    issueGet,
    riskScenarioList,
    vulnerabilityList,
    vulnerabilityGet,
    vulnerabilityRemediationList,
    personList,
    personOffboard,
    userList,
    vendorList,
    vendorGet,
    integrationList,
    monitoredComputerList,
    eventLogList,
  ],
  auth: [clientCredentials],
  healthChecks: [service, tenant, quota],
};

export default app;
