/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Position } from '@elastic/charts';
import { AggGroupNames } from '@kbn/data-plugin/public';
import { VIS_EVENT_TO_TRIGGER, VisTypeDefinition } from '@kbn/visualizations-plugin/public';
import {
  PartitionVisParams,
  LabelPositions,
  ValueFormats,
  EmptySizeRatios,
  LegendDisplay,
} from '@kbn/expression-partition-vis-plugin/common';
import { DEFAULT_PERCENT_DECIMALS } from '../../common';
import { PieTypeProps } from '../types';
import { toExpressionAst } from '../to_ast';
import { getPieOptions } from '../editor/components';
import { convertToLens } from '../convert_to_lens';

export const getPieVisTypeDefinition = ({
  showElasticChartsOptions = false,
  palettes,
}: PieTypeProps): VisTypeDefinition<PartitionVisParams> => ({
  name: 'pie',
  title: i18n.translate('visTypePie.pie.pieTitle', { defaultMessage: 'Pie' }),
  icon: 'visPie',
  description: i18n.translate('visTypePie.pie.pieDescription', {
    defaultMessage: 'Compare data in proportion to a whole.',
  }),
  fetchDatatable: true,
  toExpressionAst,
  getSupportedTriggers: () => [VIS_EVENT_TO_TRIGGER.filter],
  visConfig: {
    defaults: {
      type: 'pie',
      addTooltip: true,
      legendDisplay: !showElasticChartsOptions ? LegendDisplay.SHOW : LegendDisplay.HIDE,
      legendPosition: Position.Right,
      nestedLegend: false,
      truncateLegend: true,
      maxLegendLines: 1,
      distinctColors: false,
      isDonut: true,
      emptySizeRatio: EmptySizeRatios.SMALL,
      palette: {
        type: 'palette',
        name: 'default',
      },
      labels: {
        show: true,
        last_level: !showElasticChartsOptions,
        values: true,
        valuesFormat: ValueFormats.PERCENT,
        percentDecimals: DEFAULT_PERCENT_DECIMALS,
        truncate: 100,
        position: LabelPositions.DEFAULT,
      },
    },
  },
  editorConfig: {
    enableDataViewChange: true,
    optionsTemplate: getPieOptions({
      showElasticChartsOptions,
      palettes,
    }),
    schemas: [
      {
        group: AggGroupNames.Metrics,
        name: 'metric',
        title: i18n.translate('visTypePie.pie.metricTitle', {
          defaultMessage: 'Slice size',
        }),
        min: 1,
        max: 1,
        aggFilter: ['sum', 'count', 'cardinality', 'top_hits'],
        defaults: [{ schema: 'metric', type: 'count' }],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'segment',
        title: i18n.translate('visTypePie.pie.segmentTitle', {
          defaultMessage: 'Split slices',
        }),
        min: 0,
        max: Infinity,
        aggFilter: [
          '!geotile_grid',
          '!filter',
          '!sampler',
          '!diversified_sampler',
          '!rare_terms',
          '!multi_terms',
          '!significant_text',
        ],
      },
      {
        group: AggGroupNames.Buckets,
        name: 'split',
        title: i18n.translate('visTypePie.pie.splitTitle', {
          defaultMessage: 'Split chart',
        }),
        mustBeFirst: true,
        min: 0,
        max: 1,
        aggFilter: [
          '!geotile_grid',
          '!filter',
          '!sampler',
          '!diversified_sampler',
          '!rare_terms',
          '!multi_terms',
          '!significant_text',
        ],
      },
    ],
  },
  hierarchicalData: true,
  requiresSearch: true,
  navigateToLens: async (vis, timefilter) => (vis ? convertToLens(vis, timefilter) : null),
  getExpressionVariables: async (vis, timeFilter) => {
    return {
      canNavigateToLens: Boolean(vis?.params ? await convertToLens(vis, timeFilter) : null),
    };
  },
});
