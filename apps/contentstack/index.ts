import type { AppDefinition } from "@w6w/types";
import getStack from "./actions/get-stack.ts";
import listContentTypes from "./actions/list-content-types.ts";
import getContentType from "./actions/get-content-type.ts";
import listEntries from "./actions/list-entries.ts";
import getEntry from "./actions/get-entry.ts";
import createEntry from "./actions/create-entry.ts";
import updateEntry from "./actions/update-entry.ts";
import deleteEntry from "./actions/delete-entry.ts";
import publishEntry from "./actions/publish-entry.ts";
import unpublishEntry from "./actions/unpublish-entry.ts";
import listAssets from "./actions/list-assets.ts";
import getAsset from "./actions/get-asset.ts";
import deleteAsset from "./actions/delete-asset.ts";
import publishAsset from "./actions/publish-asset.ts";
import unpublishAsset from "./actions/unpublish-asset.ts";
import listEnvironments from "./actions/list-environments.ts";
import getEnvironment from "./actions/get-environment.ts";
import listLocales from "./actions/list-locales.ts";
import listGlobalFields from "./actions/list-global-fields.ts";
import getGlobalField from "./actions/get-global-field.ts";
import listReleases from "./actions/list-releases.ts";
import getRelease from "./actions/get-release.ts";
import createRelease from "./actions/create-release.ts";
import addReleaseItem from "./actions/add-release-item.ts";
import deployRelease from "./actions/deploy-release.ts";
import listWebhooks from "./actions/list-webhooks.ts";
import createWebhook from "./actions/create-webhook.ts";
import deleteWebhook from "./actions/delete-webhook.ts";
import listWorkflows from "./actions/list-workflows.ts";
import setEntryWorkflowStage from "./actions/set-entry-workflow-stage.ts";
import bulkPublish from "./actions/bulk-publish.ts";
import bulkUnpublish from "./actions/bulk-unpublish.ts";
import getJobStatus from "./actions/get-job-status.ts";
import listBranches from "./actions/list-branches.ts";
import managementToken from "./auth/management-token.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    getStack,
    listContentTypes,
    getContentType,
    listEntries,
    getEntry,
    createEntry,
    updateEntry,
    deleteEntry,
    publishEntry,
    unpublishEntry,
    listAssets,
    getAsset,
    deleteAsset,
    publishAsset,
    unpublishAsset,
    listEnvironments,
    getEnvironment,
    listLocales,
    listGlobalFields,
    getGlobalField,
    listReleases,
    getRelease,
    createRelease,
    addReleaseItem,
    deployRelease,
    listWebhooks,
    createWebhook,
    deleteWebhook,
    listWorkflows,
    setEntryWorkflowStage,
    bulkPublish,
    bulkUnpublish,
    getJobStatus,
    listBranches,
  ],
  auth: [managementToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
