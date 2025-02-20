/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { find } from 'lodash/fp';
import { useMemo } from 'react';
import { useAlertPrevalenceFromProcessTree } from '../../../common/containers/alerts/use_alert_prevalence_from_process_tree';
import { isActiveTimeline } from '../../../helpers';

export interface UseFetchRelatedAlertsByAncestryParams {
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] | null;
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
}
export interface UseFetchRelatedAlertsByAncestryResult {
  /**
   * Returns true while data is loading
   */
  loading: boolean;
  /**
   * Returns true if there is an error while retrieving data
   */
  error: boolean;
  /**
   * Related alerts by ancestry
   */
  data: string[] | undefined;
  /**
   * Number of alerts
   */
  dataCount: number;
}

/**
 * Retrieves all alert related by ancestry then returns a loading, error, data and count interface.
 * This uses the kibana.alert.ancestors.id and kibana.alert.rule.parameters.index fields.
 */
export const useFetchRelatedAlertsByAncestry = ({
  dataFormattedForFieldBrowser,
  scopeId,
}: UseFetchRelatedAlertsByAncestryParams): UseFetchRelatedAlertsByAncestryResult => {
  const documentId = useMemo(() => {
    const originalDocumentId = find(
      { category: 'kibana', field: 'kibana.alert.ancestors.id' },
      dataFormattedForFieldBrowser
    );
    const { values } = originalDocumentId ?? { values: [] };
    return Array.isArray(values) ? values[0] : '';
  }, [dataFormattedForFieldBrowser]);

  const { values: indices } = useMemo(
    () =>
      find(
        { category: 'kibana', field: 'kibana.alert.rule.parameters.index' },
        dataFormattedForFieldBrowser
      ) || { values: [] },
    [dataFormattedForFieldBrowser]
  );

  const isActiveTimelines = isActiveTimeline(scopeId ?? '');

  const { loading, error, alertIds } = useAlertPrevalenceFromProcessTree({
    isActiveTimeline: isActiveTimelines,
    documentId,
    indices: indices || [],
  });

  return {
    loading,
    error,
    data: alertIds,
    dataCount: (alertIds || []).length,
  };
};
