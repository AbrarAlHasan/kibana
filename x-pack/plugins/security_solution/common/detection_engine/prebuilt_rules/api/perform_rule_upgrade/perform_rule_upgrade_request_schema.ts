/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { enumeration } from '@kbn/securitysolution-io-ts-types';
import * as t from 'io-ts';

export enum PickVersionValues {
  BASE = 'BASE',
  CURRENT = 'CURRENT',
  TARGET = 'TARGET',
}

export const TPickVersionValues = enumeration('PickVersionValues', PickVersionValues);

export const RuleUpgradeSpecifier = t.exact(
  t.intersection([
    t.type({
      rule_id: t.string,
      /**
       * This parameter is needed for handling race conditions with Optimistic Concurrency Control.
       * Two or more users can call installation/_review and installation/_perform endpoints concurrently.
       * Also, in general the time between these two calls can be anything.
       * The idea is to only allow the user to install a rule if the user has reviewed the exact version
       * of it that had been returned from the _review endpoint. If the version changed on the BE,
       * installation/_perform endpoint will return a version mismatch error for this rule.
       */
      revision: t.number,
      /**
       * The target version to upgrade to.
       */
      version: t.number,
    }),
    t.partial({
      pick_version: TPickVersionValues,
    }),
  ])
);
export type RuleUpgradeSpecifier = t.TypeOf<typeof RuleUpgradeSpecifier>;

export const UpgradeSpecificRulesRequest = t.exact(
  t.intersection([
    t.type({
      mode: t.literal(`SPECIFIC_RULES`),
      rules: t.array(RuleUpgradeSpecifier),
    }),
    t.partial({
      pick_version: TPickVersionValues,
    }),
  ])
);

export const UpgradeAllRulesRequest = t.exact(
  t.intersection([
    t.type({
      mode: t.literal(`ALL_RULES`),
    }),
    t.partial({
      pick_version: TPickVersionValues,
    }),
  ])
);

export const PerformRuleUpgradeRequestBody = t.union([
  UpgradeAllRulesRequest,
  UpgradeSpecificRulesRequest,
]);
export type PerformRuleUpgradeRequestBody = t.TypeOf<typeof PerformRuleUpgradeRequestBody>;
