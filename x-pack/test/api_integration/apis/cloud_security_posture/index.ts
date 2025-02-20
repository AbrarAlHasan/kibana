/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('cloud_security_posture', function () {
    this.tags(['cloud_security_posture']);
    loadTestFile(require.resolve('./status'));
    loadTestFile(require.resolve('./benchmark'));
    loadTestFile(require.resolve('./get_csp_rule_template'));

    // Place your tests files under this directory and add the following here:
    // loadTestFile(require.resolve('./your test name'));
  });
}
