import { AnyModel } from '@anywidget/types';

/** Name for the data store traitlet */
const STORE_KEY = 'dsw_data_store';

/** Name for the ID of the widget */
const WIDGET_ID = 'dsw_id';

/**
 * A datastore which can communicate keys and values with a data store widget
 */
export type DataStore = {
  /** * Sets the value of a key in the datastore */
  set(key: string, value: string): void;
  /** Gets the value of a key in the datastore */
  get(key: string): string;
  /** Gets this cell's ID */
  getID(): string;
  /** Synchronizes the key/value pairs with the backend datastore in python */
  sync(): void;
  /** Deletes a key from the datastore */
  delete(key: string): void;
};

/**
 * Creates a data store object that can be used to communicate keys and values with a data store widget.
 *
 * Note that, due to a hacky bug workaround, you cannot set key 'key' to 'value' in the store IF there are no other keys;
 * this will not save to the persistent file in the backend. In other words, {'key': 'value'} is a prohibited DataStore.
 * @param model An AnyWidget model. This MUST be created by a widget that extends the DataStoreWidget python class
 */
export function createDataStore(model: AnyModel): DataStore {
  /** The private store. This must be replaced by a new object before syncing to get the traitlet observer to fire */
  const store = model.get(STORE_KEY);
  const id = model.get(WIDGET_ID);
  if (typeof store !== 'object' || Array.isArray(store) || store === null) {
    throw new Error(
      "'model' param does not come from a DataStoreWidget and is missing necessary fields"
    );
  }

  console.log('Datastore initialized for cell', id);

  // Super hacky fix for the traitlet observer (in python) not firing on *only* the first change
  model.set(STORE_KEY, { key: 'value' });
  model.save_changes();
  model.set(STORE_KEY, store);
  model.save_changes();

  return {
    set: (key, value) => {
      store[key] = value;
    },
    get: key => store[key],
    delete: (key: string) => {
      delete store[key];
    },
    getID: () => id,
    sync: () => {
      // We need to make a new object for the oberver to fire
      model.set(STORE_KEY, structuredClone(store));
      model.save_changes();
    }
  };
}
