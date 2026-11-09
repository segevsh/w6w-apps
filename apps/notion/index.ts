import type { AppDefinition } from "@w6w/types";
import actionAdminAddLegalHoldUsers from "./actions/admin-add-legal-hold-users.ts";
import actionAdminAddPermissionGroupMember from "./actions/admin-add-permission-group-member.ts";
import actionAdminCreateLegalHold from "./actions/admin-create-legal-hold.ts";
import actionAdminCreatePermissionGroup from "./actions/admin-create-permission-group.ts";
import actionAdminDeleteAgent from "./actions/admin-delete-agent.ts";
import actionAdminDeletePermissionGroup from "./actions/admin-delete-permission-group.ts";
import actionAdminEnqueueSpaceExport from "./actions/admin-enqueue-space-export.ts";
import actionAdminExportLegalHold from "./actions/admin-export-legal-hold.ts";
import actionAdminGetAgentCreditUsage from "./actions/admin-get-agent-credit-usage.ts";
import actionAdminGetAgentPermissions from "./actions/admin-get-agent-permissions.ts";
import actionAdminGetAgentsCreditUsage from "./actions/admin-get-agents-credit-usage.ts";
import actionAdminGetAiUsageAnalyticsReport from "./actions/admin-get-ai-usage-analytics-report.ts";
import actionAdminGetContentPagesAnalyticsReport from "./actions/admin-get-content-pages-analytics-report.ts";
import actionAdminGetLegalHold from "./actions/admin-get-legal-hold.ts";
import actionAdminGetSpaceExportStatus from "./actions/admin-get-space-export-status.ts";
import actionAdminGetUserActivityAnalyticsReport from "./actions/admin-get-user-activity-analytics-report.ts";
import actionAdminGetWorkflowsMetadataForSpace from "./actions/admin-get-workflows-metadata-for-space.ts";
import actionAdminListAnalyticsReports from "./actions/admin-list-analytics-reports.ts";
import actionAdminListLegalHoldPages from "./actions/admin-list-legal-hold-pages.ts";
import actionAdminListLegalHoldUsers from "./actions/admin-list-legal-hold-users.ts";
import actionAdminListLegalHoldWorkspaces from "./actions/admin-list-legal-hold-workspaces.ts";
import actionAdminListLegalHolds from "./actions/admin-list-legal-holds.ts";
import actionAdminListMcpClientConnections from "./actions/admin-list-mcp-client-connections.ts";
import actionAdminListPermissionGroupMembers from "./actions/admin-list-permission-group-members.ts";
import actionAdminListPermissionGroups from "./actions/admin-list-permission-groups.ts";
import actionAdminListPersonalAccessTokens from "./actions/admin-list-personal-access-tokens.ts";
import actionAdminListUsers from "./actions/admin-list-users.ts";
import actionAdminReleaseLegalHold from "./actions/admin-release-legal-hold.ts";
import actionAdminRemoveLegalHoldUser from "./actions/admin-remove-legal-hold-user.ts";
import actionAdminRemovePermissionGroupMember from "./actions/admin-remove-permission-group-member.ts";
import actionAdminRetrievePermissionGroup from "./actions/admin-retrieve-permission-group.ts";
import actionAdminRevokeMcpClientConnection from "./actions/admin-revoke-mcp-client-connection.ts";
import actionAdminRevokePersonalAccessToken from "./actions/admin-revoke-personal-access-token.ts";
import actionAdminRevokeUserSession from "./actions/admin-revoke-user-session.ts";
import actionAdminUpdateAgentCreationPolicy from "./actions/admin-update-agent-creation-policy.ts";
import actionAdminUpdateAgentCreditLimit from "./actions/admin-update-agent-credit-limit.ts";
import actionAdminUpdateAgentPermissions from "./actions/admin-update-agent-permissions.ts";
import actionAdminUpdateAgentStatus from "./actions/admin-update-agent-status.ts";
import actionAdminUpdateLegalHold from "./actions/admin-update-legal-hold.ts";
import actionAdminUpdateMcpClientConnectionEnterpriseManagedAccess from "./actions/admin-update-mcp-client-connection-enterprise-managed-access.ts";
import actionAdminUpdatePermissionGroup from "./actions/admin-update-permission-group.ts";
import actionAdminUpdatePermissionGroupMember from "./actions/admin-update-permission-group-member.ts";
import actionAdminUpdateWorkspaceCreditLimit from "./actions/admin-update-workspace-credit-limit.ts";
import actionAppendBlockChildren from "./actions/append-block-children.ts";
import actionArchivePage from "./actions/archive-page.ts";
import actionBatchManageAgents from "./actions/batch-manage-agents.ts";
import actionCancelSession from "./actions/cancel-session.ts";
import actionCompleteFileUpload from "./actions/complete-file-upload.ts";
import actionCreateComment from "./actions/create-comment.ts";
import actionCreateDataSource from "./actions/create-data-source.ts";
import actionCreateDatabase from "./actions/create-database.ts";
import actionCreateDatabasePage from "./actions/create-database-page.ts";
import actionCreateFileUpload from "./actions/create-file-upload.ts";
import actionCreateMeetingNote from "./actions/create-meeting-note.ts";
import actionCreatePage from "./actions/create-page.ts";
import actionCreateToken from "./actions/create-token.ts";
import actionCreateView from "./actions/create-view.ts";
import actionCreateViewQuery from "./actions/create-view-query.ts";
import actionDeleteAgent from "./actions/delete-agent.ts";
import actionDeleteBlock from "./actions/delete-block.ts";
import actionDeleteComment from "./actions/delete-comment.ts";
import actionDeleteView from "./actions/delete-view.ts";
import actionDeleteViewQuery from "./actions/delete-view-query.ts";
import actionGetAgent from "./actions/get-agent.ts";
import actionGetAgentInsights from "./actions/get-agent-insights.ts";
import actionGetAsyncTask from "./actions/get-async-task.ts";
import actionGetBlock from "./actions/get-block.ts";
import actionGetComment from "./actions/get-comment.ts";
import actionGetDataSource from "./actions/get-data-source.ts";
import actionGetDatabase from "./actions/get-database.ts";
import actionGetDatabasePage from "./actions/get-database-page.ts";
import actionGetFileUpload from "./actions/get-file-upload.ts";
import actionGetManyBlocks from "./actions/get-many-blocks.ts";
import actionGetManyDatabasePages from "./actions/get-many-database-pages.ts";
import actionGetManyDatabases from "./actions/get-many-databases.ts";
import actionGetManyUsers from "./actions/get-many-users.ts";
import actionGetPage from "./actions/get-page.ts";
import actionGetPageMarkdown from "./actions/get-page-markdown.ts";
import actionGetPageProperty from "./actions/get-page-property.ts";
import actionGetPluginDirectory from "./actions/get-plugin-directory.ts";
import actionGetSelf from "./actions/get-self.ts";
import actionGetSession from "./actions/get-session.ts";
import actionGetSkillDirectory from "./actions/get-skill-directory.ts";
import actionGetUser from "./actions/get-user.ts";
import actionGetView from "./actions/get-view.ts";
import actionGetViewQueryResults from "./actions/get-view-query-results.ts";
import actionIntrospectToken from "./actions/introspect-token.ts";
import actionListComments from "./actions/list-comments.ts";
import actionListCustomEmojis from "./actions/list-custom-emojis.ts";
import actionListDataSourceTemplates from "./actions/list-data-source-templates.ts";
import actionListDatabases from "./actions/list-databases.ts";
import actionListFileUploads from "./actions/list-file-uploads.ts";
import actionListPlugins from "./actions/list-plugins.ts";
import actionListViews from "./actions/list-views.ts";
import actionMovePage from "./actions/move-page.ts";
import actionQueryAgents from "./actions/query-agents.ts";
import actionQueryDataSource from "./actions/query-data-source.ts";
import actionQueryMeetingNotes from "./actions/query-meeting-notes.ts";
import actionQuerySessionEvents from "./actions/query-session-events.ts";
import actionQuerySessions from "./actions/query-sessions.ts";
import actionRefreshToken from "./actions/refresh-token.ts";
import actionRestorePage from "./actions/restore-page.ts";
import actionRevokeToken from "./actions/revoke-token.ts";
import actionSearch from "./actions/search.ts";
import actionSearchDataSources from "./actions/search-data-sources.ts";
import actionSearchDatabases from "./actions/search-databases.ts";
import actionSearchPages from "./actions/search-pages.ts";
import actionSendFileUpload from "./actions/send-file-upload.ts";
import actionUpdateAgentCreditLimit from "./actions/update-agent-credit-limit.ts";
import actionUpdateAgentStatus from "./actions/update-agent-status.ts";
import actionUpdateBlock from "./actions/update-block.ts";
import actionUpdateComment from "./actions/update-comment.ts";
import actionUpdateDataSource from "./actions/update-data-source.ts";
import actionUpdateDatabase from "./actions/update-database.ts";
import actionUpdateDatabasePage from "./actions/update-database-page.ts";
import actionUpdatePage from "./actions/update-page.ts";
import actionUpdatePageMarkdown from "./actions/update-page-markdown.ts";
import actionUpdateSession from "./actions/update-session.ts";
import actionUpdateView from "./actions/update-view.ts";
import authInternalSecret from "./auth/internal-secret.ts";
import authOauth2 from "./auth/oauth2.ts";
import authPersonalAccessToken from "./auth/personal-access-token.ts";
import authOrganizationToken from "./auth/organization-token.ts";
import authOauthClient from "./auth/oauth-client.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    actionAdminAddLegalHoldUsers,
    actionAdminAddPermissionGroupMember,
    actionAdminCreateLegalHold,
    actionAdminCreatePermissionGroup,
    actionAdminDeleteAgent,
    actionAdminDeletePermissionGroup,
    actionAdminEnqueueSpaceExport,
    actionAdminExportLegalHold,
    actionAdminGetAgentCreditUsage,
    actionAdminGetAgentPermissions,
    actionAdminGetAgentsCreditUsage,
    actionAdminGetAiUsageAnalyticsReport,
    actionAdminGetContentPagesAnalyticsReport,
    actionAdminGetLegalHold,
    actionAdminGetSpaceExportStatus,
    actionAdminGetUserActivityAnalyticsReport,
    actionAdminGetWorkflowsMetadataForSpace,
    actionAdminListAnalyticsReports,
    actionAdminListLegalHoldPages,
    actionAdminListLegalHoldUsers,
    actionAdminListLegalHoldWorkspaces,
    actionAdminListLegalHolds,
    actionAdminListMcpClientConnections,
    actionAdminListPermissionGroupMembers,
    actionAdminListPermissionGroups,
    actionAdminListPersonalAccessTokens,
    actionAdminListUsers,
    actionAdminReleaseLegalHold,
    actionAdminRemoveLegalHoldUser,
    actionAdminRemovePermissionGroupMember,
    actionAdminRetrievePermissionGroup,
    actionAdminRevokeMcpClientConnection,
    actionAdminRevokePersonalAccessToken,
    actionAdminRevokeUserSession,
    actionAdminUpdateAgentCreationPolicy,
    actionAdminUpdateAgentCreditLimit,
    actionAdminUpdateAgentPermissions,
    actionAdminUpdateAgentStatus,
    actionAdminUpdateLegalHold,
    actionAdminUpdateMcpClientConnectionEnterpriseManagedAccess,
    actionAdminUpdatePermissionGroup,
    actionAdminUpdatePermissionGroupMember,
    actionAdminUpdateWorkspaceCreditLimit,
    actionAppendBlockChildren,
    actionArchivePage,
    actionBatchManageAgents,
    actionCancelSession,
    actionCompleteFileUpload,
    actionCreateComment,
    actionCreateDataSource,
    actionCreateDatabase,
    actionCreateDatabasePage,
    actionCreateFileUpload,
    actionCreateMeetingNote,
    actionCreatePage,
    actionCreateToken,
    actionCreateView,
    actionCreateViewQuery,
    actionDeleteAgent,
    actionDeleteBlock,
    actionDeleteComment,
    actionDeleteView,
    actionDeleteViewQuery,
    actionGetAgent,
    actionGetAgentInsights,
    actionGetAsyncTask,
    actionGetBlock,
    actionGetComment,
    actionGetDataSource,
    actionGetDatabase,
    actionGetDatabasePage,
    actionGetFileUpload,
    actionGetManyBlocks,
    actionGetManyDatabasePages,
    actionGetManyDatabases,
    actionGetManyUsers,
    actionGetPage,
    actionGetPageMarkdown,
    actionGetPageProperty,
    actionGetPluginDirectory,
    actionGetSelf,
    actionGetSession,
    actionGetSkillDirectory,
    actionGetUser,
    actionGetView,
    actionGetViewQueryResults,
    actionIntrospectToken,
    actionListComments,
    actionListCustomEmojis,
    actionListDataSourceTemplates,
    actionListDatabases,
    actionListFileUploads,
    actionListPlugins,
    actionListViews,
    actionMovePage,
    actionQueryAgents,
    actionQueryDataSource,
    actionQueryMeetingNotes,
    actionQuerySessionEvents,
    actionQuerySessions,
    actionRefreshToken,
    actionRestorePage,
    actionRevokeToken,
    actionSearch,
    actionSearchDataSources,
    actionSearchDatabases,
    actionSearchPages,
    actionSendFileUpload,
    actionUpdateAgentCreditLimit,
    actionUpdateAgentStatus,
    actionUpdateBlock,
    actionUpdateComment,
    actionUpdateDataSource,
    actionUpdateDatabase,
    actionUpdateDatabasePage,
    actionUpdatePage,
    actionUpdatePageMarkdown,
    actionUpdateSession,
    actionUpdateView,
  ],
  auth: [
    authInternalSecret,
    authOauth2,
    authPersonalAccessToken,
    authOrganizationToken,
    authOauthClient,
  ],
  healthChecks: [service, quota],
} satisfies AppDefinition;
