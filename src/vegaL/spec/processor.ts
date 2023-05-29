import { JSONPatchReplace, immutableJSONPatch } from 'immutable-json-patch';
import { JSONPath } from 'jsonpath-plus';
import { TopLevelSpec } from 'vega-lite';
import { isUnitSpec } from 'vega-lite/build/src/spec';
import { TopLevelParameter } from 'vega-lite/build/src/spec/toplevel';
import { deepClone } from '../../utils/deepClone';
import { JSONPathResult } from '../../utils/jsonpath';
import { LayerSpec } from './spec';
import { AnyUnitSpec } from './view';

/**
 * *An view object is representation of individual unit specs that make up a composite view.*
 *
 * View object has a `base` property which is original vegalite spec for the unit chart.
 *
 * It also has a `path` string which points to location of the `base` in the original vegalite spec.
 *
 * Finally there is the `spec` property which holds the new layer container for IDE enabled vegalite charts.
 */
type ViewObject = {
  spec: {
    layer: LayerSpec['layer'];
  };
  path: string;
  base: AnyUnitSpec;
};

/**
 * Callback which takes in unit spec and operates on it. It returns the modified unit spec.
 */
type UnitSpecCallback = (spec: AnyUnitSpec) => AnyUnitSpec;

/**
 * Callback to modify a top-level parameter.
 */
type ParamCallback = (param: TopLevelParameter) => TopLevelParameter;

/**
 * Class to process the vegalite spec and transform it to IDE compatible vegalite spec.
 */
export class VegaLiteSpecProcessor {
  static init(
    spec: TopLevelSpec,
    unitSpecJSONPath: string = this.DEFAULT_UNIT_SPEC_JSON_PATH
  ) {
    return new VegaLiteSpecProcessor(spec, unitSpecJSONPath);
  }

  /**
   * json path query to select minimal unit spec. Assumption is unit spec always has `mark`
   */
  static readonly DEFAULT_UNIT_SPEC_JSON_PATH = '$..*[?(@property==="mark")]^';

  /**
   * Reference to original vegalite spec. This is never changed.
   */
  private readonly _rawSpec: TopLevelSpec;

  /**
   * copy of the original vegalite spec that is modified.
   */
  private readonly _baseSpec: TopLevelSpec;

  /**
   * json path query to select minimal unit spec
   */
  private readonly _PATH: string =
    VegaLiteSpecProcessor.DEFAULT_UNIT_SPEC_JSON_PATH;

  /**
   * Array of view objects.
   */
  private readonly _viewLayerSpecs: Array<ViewObject> = [];

  /**
   * Holds a hash of `layer name` to an array of `UnitSpecCallback` functions.
   * The array of callbacks are chained on the unit spec
   */
  private readonly _layerFns = new Map<string, Array<UnitSpecCallback>>();

  /**
   * private constructor
   */
  private constructor(spec: TopLevelSpec, unitSpecJSONPath: string) {
    this._rawSpec = deepClone(spec);
    this._baseSpec = deepClone(spec);

    this._PATH = unitSpecJSONPath;

    const specs: JSONPathResult<AnyUnitSpec> = JSONPath({
      json: this._baseSpec,
      path: this._PATH,
      resultType: 'all'
    });

    specs.forEach(specPath => {
      const { value: spec, pointer } = specPath;
      if (!isUnitSpec(spec)) throw new Error('Should not enter here.');

      const layerObject: ViewObject = {
        base: spec,
        spec: {
          layer: []
        },
        path: pointer
      };

      this._viewLayerSpecs.push(layerObject);
    });
  }

  /**
   * the path used to detect unit spec
   */
  get unitSpecJSONPath() {
    return this._PATH;
  }

  /**
   * access the original spec
   */
  get originalSpec() {
    return this._rawSpec;
  }

  /**
   * access the currently modified spec
   */
  get baseSpec(): TopLevelSpec {
    return this._baseSpec;
  }

  /**
   * access the final processed spec. Calls the `_process` function.
   */
  get spec(): TopLevelSpec {
    return this._process();
  }

  /**
   * get the top level parameters
   */
  get params() {
    if (!this._baseSpec.params) this._baseSpec.params = [];
    return this._baseSpec.params;
  }

  /**
   * set the top level parameters
   */
  set params(params: TopLevelParameter[]) {
    this._baseSpec.params = params;
  }

  /**
   * applies the callback to all top level params
   */
  updateTopLevelParameter(cb: ParamCallback = p => p) {
    this.params = this.params.map(p => cb(p));
  }

  /**
   * adds the callback to array of layer names.
   */
  addLayer(name: string, cb: UnitSpecCallback = s => s) {
    let layerFns = this._layerFns.get(name) || [];

    this._layerFns.set(name, [...layerFns, cb]);
  }

  /**
   * Applies the layer spec callback to `_baseSpec` to get the final `spec`
   */
  private _process(): TopLevelSpec {
    if (this._layerFns.size === 0) {
      // if there are no layer functions, just return original unit specs.
      this.addLayer('BASE');
    }

    // update the layer container for each detected view (unit spec)
    const updatedLayerSpecs = this._viewLayerSpecs.map(_view => {
      const view = deepClone(_view);

      const { base } = view;

      // loop over the layer functions and chain it over the base spec. Push this the layer container.
      // It creates copies of the base spec and applies transforms to create modified spec
      // The final layer contains an array of all layers where each layer represents a different operation.
      this._layerFns.forEach(fns => {
        const updatedSpec = fns.reduce((s, fn) => fn(s), deepClone(base)); // reduce to chain

        // add to layer container
        view.spec.layer.push(updatedSpec);
      });

      return view;
    });

    // create json patches to change unit specs to layer containers
    const patches: Array<JSONPatchReplace> = [];

    updatedLayerSpecs.forEach(({ path, spec }) => {
      patches.push({
        op: 'replace',
        path,
        value: spec as any
      });
    });

    // apply the patches to `_baseSpec`
    const topSpec: TopLevelSpec = immutableJSONPatch(
      deepClone(this._baseSpec) as any,
      deepClone(patches)
    ) as any;

    return topSpec;
  }
}
