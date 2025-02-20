/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Careful of exporting anything from this file as any file(s) you export here will cause your page bundle size to increase.
// If you're using functions/types/etc... internally or within integration tests it's best to import directly from their paths
// than expose the functions/types/etc... here. You should _only_ expose functions/types/etc... that need to be shared with other plugins here.

// When you do have to add things here you might want to consider creating a package such as kbn-cases-constants to share with
// other plugins instead as packages are easier to break down and you do not have to carry the cost of extra plugin weight on
// first download since the other plugins/areas of your code can directly pull from the package in their async imports.
// For example, constants below could eventually be in a "kbn-cases-constants" instead.
// See: https://docs.elastic.dev/kibana-dev-docs/key-concepts/platform-intro#public-plugin-api

export type { Case, Cases, CasesBulkGetResponse } from './api';
export type {
  CaseUI,
  CasesUI,
  CasesFindResponseUI,
  Ecs,
  CaseViewRefreshPropInterface,
  CasesPermissions,
} from './ui/types';

export {
  APP_ID,
  CASES_URL,
  SECURITY_SOLUTION_OWNER,
  OBSERVABILITY_OWNER,
  GENERAL_CASES_OWNER,
  CREATE_CASES_CAPABILITY,
  DELETE_CASES_CAPABILITY,
  PUSH_CASES_CAPABILITY,
  READ_CASES_CAPABILITY,
  UPDATE_CASES_CAPABILITY,
  INTERNAL_BULK_GET_CASES_URL,
} from './constants';

export {
  CommentType,
  CaseStatuses,
  CaseSeverity,
  ConnectorTypes,
  getCasesFromAlertsUrl,
  throwErrors,
  ExternalReferenceStorageType,
} from './api';
export { StatusAll } from './ui/types';
export { createUICapabilities } from './utils/capabilities';
export { getApiTags } from './utils/api_tags';
