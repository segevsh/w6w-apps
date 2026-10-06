/**
 * Axonaut — French all-in-one CRM and invoicing. Companies, employees, quotations, invoices,
 * products, opportunities, tasks and projects over the Axonaut REST API v2 (`axonaut.com/api/v2`).
 *
 * Every path, verb, parameter and enum here was verified on 2026-10-06 against the OpenAPI 3.0
 * document embedded in `https://axonaut.com/api/v2/doc`, plus live probes of the host.
 *
 * Findings that shaped the design (details where they matter, and in the README):
 *
 *  1. **Pagination is a request HEADER** named `page`, not a query parameter (`lib/client.ts`).
 *  2. **`GET /me` returns the caller's own API key**, so it is never the auth probe; the check
 *     is `GET /languages` (`auth/api-key.ts`).
 *  3. **Errors are `{"error": {"message", "status_code"}}`** with a STRING status code, and the
 *     verdict is read from that body, not the HTTP status.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

import companyList from "./actions/company-list.ts";
import companyGet from "./actions/company-get.ts";
import companyCreate from "./actions/company-create.ts";
import companyUpdate from "./actions/company-update.ts";
import companyDelete from "./actions/company-delete.ts";
import employeeList from "./actions/employee-list.ts";
import employeeGet from "./actions/employee-get.ts";
import employeeCreate from "./actions/employee-create.ts";
import employeeUpdate from "./actions/employee-update.ts";
import invoiceList from "./actions/invoice-list.ts";
import companyInvoiceList from "./actions/company-invoice-list.ts";
import invoiceGet from "./actions/invoice-get.ts";
import invoiceCreate from "./actions/invoice-create.ts";
import quotationList from "./actions/quotation-list.ts";
import quotationGet from "./actions/quotation-get.ts";
import quotationCreate from "./actions/quotation-create.ts";
import productList from "./actions/product-list.ts";
import productGet from "./actions/product-get.ts";
import productCreate from "./actions/product-create.ts";
import productUpdate from "./actions/product-update.ts";
import opportunityList from "./actions/opportunity-list.ts";
import opportunityGet from "./actions/opportunity-get.ts";
import opportunityCreate from "./actions/opportunity-create.ts";
import opportunityUpdate from "./actions/opportunity-update.ts";
import opportunityWon from "./actions/opportunity-won.ts";
import opportunityLost from "./actions/opportunity-lost.ts";
import taskList from "./actions/task-list.ts";
import taskCreate from "./actions/task-create.ts";
import taskUpdate from "./actions/task-update.ts";
import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";

export default {
  actions: [
    companyList,
    companyGet,
    companyCreate,
    companyUpdate,
    companyDelete,
    employeeList,
    employeeGet,
    employeeCreate,
    employeeUpdate,
    invoiceList,
    companyInvoiceList,
    invoiceGet,
    invoiceCreate,
    quotationList,
    quotationGet,
    quotationCreate,
    productList,
    productGet,
    productCreate,
    productUpdate,
    opportunityList,
    opportunityGet,
    opportunityCreate,
    opportunityUpdate,
    opportunityWon,
    opportunityLost,
    taskList,
    taskCreate,
    taskUpdate,
    projectList,
    projectGet,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
