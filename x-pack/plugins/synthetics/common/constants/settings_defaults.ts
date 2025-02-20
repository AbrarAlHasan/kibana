/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DynamicSettings, DynamicSettingsAttributes } from '../runtime_types';

export const DYNAMIC_SETTINGS_DEFAULTS: DynamicSettings = {
  heartbeatIndices: 'heartbeat-8*,heartbeat-7*',
  certAgeThreshold: 730,
  certExpirationThreshold: 30,
  defaultConnectors: [],
  defaultEmail: {
    to: [],
    cc: [],
    bcc: [],
  },
};

// `DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES` helps isolate the Saved Object attributes from `DynamicSettings`
// which represents API response type. It may initially be a duplicate of `DYNAMIC_SETTINGS_DEFAULTS`
export const DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES: DynamicSettingsAttributes =
  DYNAMIC_SETTINGS_DEFAULTS;
