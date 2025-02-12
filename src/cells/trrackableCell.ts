import { State, extend, hookstate } from '@hookstate/core';

import { LocalStored, localstored } from '@hookstate/localstored';
import { subscribable, Subscribable } from '@hookstate/subscribable';
import { decompressString, getCellStoreEngine } from '../utils/cellStoreEngine';
import { TrrackManager } from '../widgets/trrack/manager';
import {
  stripImmutableClone,
  stripImmutableCloneJSON
} from '../utils/stripImmutableClone';
import { TrrackGraph } from '../widgets/trrack/types';
import { GeneratedRecord } from '../widgets/utils/dataframe';
// import { Signal } from '@lumino/signaling';
import { AnyModel } from '@anywidget/types';
import { createDataStore, DataStore } from '../utils/data_store';

export const CODE_CELL = 'code-cell';
export const TRRACK_GRAPH = 'trrack_graph';
export const VEGALITE_SPEC = 'vegalite-spec';
export const ACTIVE_CATEGORY = 'active-category';
export const GENERATED_DATAFRAMES = '__GENERATED_DATAFRAMES__';
export const HAS_PERSIST_OUTPUT = '__has_persist_output';

export class TrrackableCell {
  // Trrack graph
  private __trrackGraph: State<TrrackGraph | null, LocalStored> | null = null;
  private _generatedDataframes: State<GeneratedRecord, Subscribable>;
  private dataStore: DataStore;

  _trrackManager: TrrackManager | null = null;

  constructor(model: AnyModel) {
    // I don't think we have access to cellMap now that we're not executing the Jupyterlab entry point
    // if (!window.Persist.CellMap) {
    //   throw new Error('Entry point not executed');
    // }
    // window.Persist.CellMap.set(this.cell_id, this);
    this.dataStore = createDataStore(model);

    const savedGenRecordString = this.dataStore.get(GENERATED_DATAFRAMES);
    const savedGenRecord: any = {};
    savedGenRecordString
      ? JSON.parse(decompressString(savedGenRecordString))
      : null;

    this._generatedDataframes = hookstate<GeneratedRecord, Subscribable>(
      savedGenRecord,
      extend(
        subscribable(),
        localstored({
          key: GENERATED_DATAFRAMES,
          engine: getCellStoreEngine(this)
        })
      )
    );

    // const savedString = this.model.getMetadata(TRRACK_GRAPH);
    // const savedGraph: TrrackGraph | null = savedString
    //   ? JSON.parse(decompressString(savedString))
    //   : null;
    //
    // this._trrackGraph = hookstate<TrrackGraph | null, LocalStored>(
    //   savedGraph,
    //   localstored({
    //     key: TRRACK_GRAPH,
    //     engine: getCellStoreEngine(this)
    //   })
    // );

    // Hopefully we don't need these two lines... TBD
    // add id so that it can be extracted
    // this.node.dataset.id = this.cell_id;
    // add the code-cell tag
    // this.node.dataset.celltype = CODE_CELL;

    // TBD
    // Idk what this does, but we'll figure out if it's a necessary feature later
    // const displayPersistNotice = async (
    //   outputModel: IOutputAreaModel,
    //   _: unknown
    // ) => {
    //   await this.ready;

    //   const node = this.node;

    //   const footer: HTMLDivElement | null =
    //     node.querySelector('.jp-CellFooter');

    //   if (outputModel.length !== 0) {
    //     if (footer) {
    //       footer.innerHTML = '';
    //     }

    //     return;
    //   }

    //   if (this.model.getMetadata(TRRACK_GRAPH)) {
    //     if (footer) {
    //       footer.style.height = 'auto';
    //       footer.innerHTML = `
    //             <div style="height:20px;width:100%;text-align:center">
    //             This cell is a persist cell. Please run the cell to enable interactive output.
    //             </div>
    //               `;
    //     }
    //   }
    // };

    // this.model.outputs.changed.connect(displayPersistNotice, this);
    // displayPersistNotice(this.model.outputs, this);
  }

  private get _trrackGraph() {
    if (this.__trrackGraph === null) {
      const savedString = this.dataStore.get(TRRACK_GRAPH);
      const savedGraph: TrrackGraph | null = savedString
        ? JSON.parse(decompressString(savedString))
        : null;

      this.__trrackGraph = hookstate<TrrackGraph | null, LocalStored>(
        savedGraph,
        localstored({
          key: TRRACK_GRAPH,
          engine: getCellStoreEngine(this)
        })
      );
    }

    return this.__trrackGraph;
  }

  get trrackManager() {
    if (!this._trrackManager) {
      this._trrackManager = TrrackManager.getInstance(this);
    }
    return this._trrackManager;
  }

  tagAsPersistCell(has = true) {
    this.dataStore.set(HAS_PERSIST_OUTPUT, has.toString());
  }

  get generatedDataframesState() {
    return this._generatedDataframes;
  }

  get generatedDataframes() {
    return stripImmutableCloneJSON(
      this._generatedDataframes.get({ noproxy: true })
    );
  }

  get trrackGraphState() {
    return this._trrackGraph;
  }

  get trrackGraph() {
    return stripImmutableClone(this._trrackGraph.get({ noproxy: true }));
  }

  get cell_id() {
    return this.dataStore.getID();
  }

  /**
   * Sets the value of a persistent property
   * @param key The key of the property
   * @param value The value of the property
   */
  setProp(key: string, value: string) {
    this.dataStore.set(key, value);
    this.dataStore.sync();
  }

  /**
   * Gets the value of a persistent property
   * @param key The key of the property
   * @returns The value of the property
   */
  getProp(key: string): string {
    return this.dataStore.get(key);
  }

  /**
   * Deletes a persistent property
   * @param key The key of the property
   */
  deleteProp(key: string) {
    this.dataStore.delete(key);
    this.dataStore.sync();
  }

  // TBD whether we need this too... would have to figure out how to implement disposal??
  // dispose() {
  //   if (this.isDisposed) {
  //     return;
  //   }
  //   window.Persist.CellMap.delete(this.cell_id);

  //   Signal.clearData(this);
  //   super.dispose();
  // }
}

export namespace TrrackableCell {
  export function create(model: AnyModel) {
    return new TrrackableCell(model);
  }

  export function isTrrackableCell(cell: unknown): cell is TrrackableCell {
    return cell instanceof TrrackableCell;
  }
}
