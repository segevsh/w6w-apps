import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import searchPeople from "./actions/search-people.ts";
import getPerson from "./actions/get-person.ts";
import findPersonByEmail from "./actions/find-person-by-email.ts";
import createPerson from "./actions/create-person.ts";
import updatePerson from "./actions/update-person.ts";
import deletePerson from "./actions/delete-person.ts";

import searchCompanies from "./actions/search-companies.ts";
import createCompany from "./actions/create-company.ts";
import updateCompany from "./actions/update-company.ts";

import searchOpportunities from "./actions/search-opportunities.ts";
import createOpportunity from "./actions/create-opportunity.ts";
import updateOpportunity from "./actions/update-opportunity.ts";

import searchLeads from "./actions/search-leads.ts";
import createLead from "./actions/create-lead.ts";

import searchTasks from "./actions/search-tasks.ts";
import createTask from "./actions/create-task.ts";

import searchActivities from "./actions/search-activities.ts";
import createActivity from "./actions/create-activity.ts";

import listPipelines from "./actions/list-pipelines.ts";
import listPipelineStages from "./actions/list-pipeline-stages.ts";
import listActivityTypes from "./actions/list-activity-types.ts";
import listCustomFieldDefinitions from "./actions/list-custom-field-definitions.ts";
import listUsers from "./actions/list-users.ts";
import listRelatedItems from "./actions/list-related-items.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Person — the individual contact
    searchPeople,
    getPerson,
    findPersonByEmail,
    createPerson,
    updatePerson,
    deletePerson,
    // Company — the customer organization
    searchCompanies,
    createCompany,
    updateCompany,
    // Opportunity — the deal
    searchOpportunities,
    createOpportunity,
    updateOpportunity,
    // Lead — the pre-qualification catch-all
    searchLeads,
    createLead,
    // Task
    searchTasks,
    createTask,
    // Activity — notes, calls, meetings
    searchActivities,
    createActivity,
    // Account metadata — the id lookups the actions above depend on
    listPipelines,
    listPipelineStages,
    listActivityTypes,
    listCustomFieldDefinitions,
    listUsers,
    listRelatedItems,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
