/* eslint-disable @typescript-eslint/no-non-null-assertion */

import embed from 'vega-embed';
import { TopLevelSpec, compile } from 'vega-lite';

import { isSelectionParameter } from 'vega-lite/build/src/selection';
import {
  CalculateTransform,
  JoinAggregateTransform
} from 'vega-lite/build/src/transform';
import { pipe } from '../utils/pipe';
import { VegaLiteSpecProcessor } from '../vegaL/spec';
import { addEncoding } from '../vegaL/spec/encoding';
import {
  extractFilterFields,
  getCompositeOutFilterFromSelections,
  invertFilter,
  mergeFilters
} from '../vegaL/spec/filter';
import {
  AnyUnitSpec,
  removeUnitSpecName,
  removeUnitSpecSelectionFilters,
  removeUnitSpecSelectionParams
} from '../vegaL/spec/view';
import { Interaction, Interactions } from './types';

const outFilterLayer = 'BASE';
// const inFilterLayer = 'FILTERED_ELEMENT_LAYER';
// const aggregateLayer = 'AGGREGATE_ELEMENT_LAYER';

export class ApplyInteractions {
  static cache: Map<TopLevelSpec, Map<Interaction, TopLevelSpec>> = new Map();

  constructor(private interactions: Interactions) {
    //
  }

  apply(spec: TopLevelSpec) {
    const vlProc = VegaLiteSpecProcessor.init(spec);

    this.interactions.forEach(interaction => {
      this.applyInteraction(vlProc, interaction);
    });

    console.log('update', vlProc.spec);

    return vlProc.spec;
  }

  applyInteraction(vlProc: VegaLiteSpecProcessor, interaction: Interaction) {
    switch (interaction.type) {
      case 'selection':
        this.applySelection(vlProc, interaction);
        break;
      case 'filter':
        this.applyFilter(vlProc, interaction);
        break;
      case 'aggregate':
        this.applyAggregate(vlProc, interaction);
        break;
      default:
        break;
    }
  }

  // NOTE: For point selection, try tupleId? refer to selection.ts #8
  applySelection(
    vlProc: VegaLiteSpecProcessor,
    selection: Interactions.SelectionAction
  ) {
    vlProc.updateTopLevelParameter(param => {
      if (isSelectionParameter(param) && param.name === selection.name) {
        param.value = selection.value;
      }

      return param;
    });
  }

  applyFilter(
    vlProc: VegaLiteSpecProcessor,
    filter: Interactions.FilterAction
  ) {
    const params = vlProc.params;

    const outFilter = getCompositeOutFilterFromSelections(
      params.filter(isSelectionParameter)
    );

    vlProc.updateTopLevelParameter(p => {
      delete p.value;
      return p;
    });

    function addFilterOutLayer(spec: AnyUnitSpec) {
      const { transform = [] } = spec;

      const fl =
        filter.direction === 'out' ? outFilter : invertFilter(outFilter);
      transform.push(fl);

      spec.transform = mergeFilters(transform);

      return spec;
    }

    vlProc.addLayer(outFilterLayer, addFilterOutLayer);
  }

  applyAggregate(
    vlProc: VegaLiteSpecProcessor,
    aggregate: Interactions.AggregateAction
  ) {
    const AGG_NAME = `Agg_${aggregate.id}`;

    const params = vlProc.params;

    const selections = params.filter(isSelectionParameter);
    const outFilter = getCompositeOutFilterFromSelections(selections);
    const inFilter = invertFilter(outFilter);

    vlProc.updateTopLevelParameter(p => {
      if (isSelectionParameter(p)) {
        delete p.value;
      }
      return p;
    });

    function addFilterOutLayer(spec: AnyUnitSpec) {
      const { transform = [] } = spec;

      transform.push(outFilter);

      spec.transform = mergeFilters(transform);

      return spec;
    }

    vlProc.addLayer(outFilterLayer, addFilterOutLayer);

    function addFilterInLayer(spec: AnyUnitSpec) {
      const { transform = [] } = spec;

      transform.push(inFilter); // add new filters

      spec.transform = mergeFilters(transform, 'and');
      spec.encoding = addEncoding(spec.encoding, 'fillOpacity', {
        value: 0.2
      });
      spec.encoding = addEncoding(spec.encoding, 'strokeOpacity', {
        value: 0.8
      });

      return pipe(
        removeUnitSpecName,
        removeUnitSpecSelectionParams,
        removeUnitSpecSelectionFilters
      )(spec);
    }

    vlProc.addLayer(AGG_NAME + 'IN', addFilterInLayer);

    function addAggregateLayer(spec: AnyUnitSpec) {
      const { transform = [] } = spec;

      transform.push(inFilter); // filter in the selected points

      const fields = extractFilterFields(inFilter); // get the field names from filters

      const agg: JoinAggregateTransform = {
        joinaggregate: fields.map(field => {
          return {
            field,
            as: AGG_NAME,
            op: 'mean'
          };
        }),
        groupby: fields
      };

      const calc: CalculateTransform[] = fields.map(field => ({
        calculate: `"${AGG_NAME}"`,
        as: field
      }));

      transform.push(agg);
      transform.push(...calc);

      spec.transform = mergeFilters(transform);

      return pipe(
        removeUnitSpecName,
        removeUnitSpecSelectionParams,
        removeUnitSpecSelectionFilters
      )(spec);
    }

    vlProc.addLayer(AGG_NAME + 'AGG', addAggregateLayer);
  }
}

export async function getDataFromVegaSpec(spc: any, _opt = true) {
  if (_opt) return [];

  const div = document.createElement('div');
  const vg = compile(spc as any);

  const { view } = await embed(div, vg.spec);

  const dataState = view.getState({
    data: (n?: string) => {
      return !!n;
    }
  }).data;

  const dataSources = Object.keys(dataState)
    .filter(d => d.startsWith('data_'))
    .sort()
    .reverse();

  const finalDatasetName = dataSources[0];

  const sourceData = view.data('source_0');
  const finalData = view.data(finalDatasetName);

  const data = [...sourceData, ...finalData];

  view.finalize();
  div.remove();

  return data;
}
