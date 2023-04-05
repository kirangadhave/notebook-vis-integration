import { JSONValue } from '@lumino/coreutils';
import { Signal } from '@lumino/signaling';
import { deepClone } from 'fast-json-patch';
import { JSONPath as jp } from 'jsonpath-plus';
import { Result } from 'vega-embed';
import { Nullable } from '../../../types';
import { IDEGlobal } from '../../../utils';
import { TrrackableCell } from '../../trrackableCell';
import { ApplyInteractions } from './helpers';
import { getSelectionIntervalListener } from './listeners';
import { RenderedTrrackVegaOutput } from './renderer';

export type Vega = Result;

export class VegaManager extends TrrackableCell.ContentManager {
  private _listeners: { [key: string]: any } = {};
  private _renderer: Nullable<RenderedTrrackVegaOutput> = null;
  constructor(cell: TrrackableCell) {
    super(cell);

    this._tManager.currentChange.connect(() => {
      this.update();
      // cell.updateVegaSpec();
    }, this);
  }

  _registerGlobally(): void {
    IDEGlobal.vegaManager.set(this._cell.cellId, this);
  }

  update() {
    const rootSpec = deepClone(this._cell.executionSpec);

    const interactions = this._tManager.trrack.getState().interactions;
    const newSpec = new ApplyInteractions(interactions).apply(rootSpec);

    this._cell.updateVegaSpec(newSpec);
  }

  dispose() {
    if (this.isDisposed) return;
    Signal.disconnectReceiver(this);
    this.isDisposed = true;
    this.view?.finalize();
  }

  private get _cellId() {
    return this._cell.cellId;
  }

  private get _tManager() {
    return this._cell.trrackManager;
  }

  get hasVega() {
    return !!this.view;
  }

  get vega(): Nullable<Vega> {
    return this.renderer?.vega;
  }

  get view() {
    return this.vega?.view;
  }

  get spec(): JSONValue {
    return deepClone(this.vega?.spec || {}) as JSONValue;
  }

  get renderer() {
    return this._renderer;
  }

  set renderer(val: Nullable<RenderedTrrackVegaOutput>) {
    this._renderer = val;
  }

  async removeBrushes() {
    // for (const selector in (this.spec as any).selection) {
    //   await this.applySelectionInterval(selector, {
    //     x: [],
    //     y: [],
    //     selection: {}
    //   });
    // }
  }

  addListeners() {
    this.addSelectionListeners();
  }

  addSelectionListeners() {
    if (!this.view) return;

    this.removeSelectionListeners();

    const selectionPaths = jp({
      path: '$..selection[?(@parentProperty !== "encoding")]',
      json: this.spec,
      resultType: 'all'
    });

    for (let i = 0; i < selectionPaths.length; ++i) {
      const selectionPath = selectionPaths[i];
      const type = selectionPath.value.type;
      const selector = selectionPath.parentProperty;

      if (type === 'interval') {
        const listener = getSelectionIntervalListener({
          manager: this,
          selectionPath,
          trrackManager: this._tManager,
          cellId: this._cellId
        });

        this._listeners[selector] = listener;
        this.view.addSignalListener(selector, listener);
      }
    }
  }

  removeListeners() {
    this.removeSelectionListeners();
  }

  removeSelectionListeners() {
    // Wrong
    for (const selector in this._listeners) {
      this.view?.removeSignalListener(selector, this._listeners[selector]);
    }
  }
}
