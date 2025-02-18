import { View } from 'vega';
import { TrrackableCell } from '../cells';

/**
 * Global views map.
 * This is a singleton map that stores all the views in the notebook.
 */
export class PersistViews extends WeakMap<TrrackableCell, View> {
  private static _instance: PersistViews;

  /**
   * The singleton instance of the views map.
   */
  static get instance() {
    if (!PersistViews._instance) {
      PersistViews._instance = new PersistViews();
    }

    return PersistViews._instance;
  }

  private constructor() {
    super();
  }
}

/**
 * Global cell map.
 * This is a singleton map that stores all the cells in the notebook.
 */
export class PersistCellMap extends Map<string, TrrackableCell> {
  private static _instance: PersistCellMap;

  /**
   * The singleton instance of the cell map.
   */
  static get instance() {
    if (!PersistCellMap._instance) {
      PersistCellMap._instance = new PersistCellMap();
    }

    return PersistCellMap._instance;
  }

  private constructor() {
    super();
  }
}
