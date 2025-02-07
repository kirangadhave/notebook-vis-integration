from typing import Dict
import anywidget, traitlets
import pickle as pkl
from traitlets import observe

FILE_EXTENSION = ".jupersist"

dsw_global_data_store = {}

def init_data_store(file_name: str):
  """
  Initializes a datastore in the current global scope, allowing DataStoreWidgets to be used.
  This function creates a new data store file if it does not already exist.
  If the file already exists, it loads the existing data store from the file.
  Args:
    file_name (str): The name of the file to be used for the data store. 
             The file name must not contain '.', '/', or '\\'.
  Raises:
    ValueError: If the file_name is not a string or contains '.', '/', or '\\'.
    FileExistsError: If the file already exists when trying to create a new one.
  Side Effects:
    Sets the global variable `dsw_global_data_store` to the contents of the data store.
    Sets the global variable `dsw_file_name` to the name of the data store file.
  """
  if type(file_name) is not str:
    raise ValueError("file_name must be a string")
  
  if '.' in file_name or '/' in file_name or '\\' in file_name:
    raise ValueError("file_name cannot contain '.' or '/' or '\\'")
  
  file_name = file_name + FILE_EXTENSION
  global dsw_global_data_store

  try:
    with open(file_name, 'xb') as file:
      pkl.dump({}, file)
      dsw_global_data_store = {}
  except FileExistsError:
    with open(file_name, 'rb') as file:
      dsw_global_data_store = pkl.load(file)
  
  global dsw_file_name
  dsw_file_name = file_name

class DataStoreWidget(anywidget.AnyWidget):
  """
  DataStoreWidget is an abstract extension of Anywidget that can be extended to create a Jupyter widget which
  can store persistent data in a file on the backend. Data is stored as string key-value pairs.

  On the frontend, a separate class, DataStore, is required to interact with the data store.
  Args:
    id (str): The unique identifier for the data store.
    **kwargs: Additional keyword arguments passed to the superclass initializer.
  Raises:
    NotImplementedError: If an attempt is made to directly instantiate the abstract class.
    ValueError: If init_data_store() has not been called in this global scope
      before the first instantiation of a DataStoreWidget.
  """
  dsw_data_store = traitlets.Dict({}).tag(sync=True)
  dsw_id = traitlets.Unicode("").tag(sync=True)
  def __init__(self, id: str, **kwargs):
    self.dsw_id = id
    super().__init__(**kwargs)

    if type(self) is DataStoreWidget:
      raise NotImplementedError("Cannot directly instantiate abstract class DataStoreWidget")
        
    if 'dsw_file_name' not in globals():
      raise ValueError("DataStoreWidget must be initialized with init_data_store before use")
    
    global dsw_global_data_store
    self.dsw_data_store = dsw_global_data_store.get(self.dsw_id, {})
    self.observe(self._data_changed, names='dsw_data_store')

  def _data_changed(self, _):
    # Ignore the initial value of dsw_data_store, which is set to work around a bug
    if len(self.dsw_data_store.keys()) == 1 and self.dsw_data_store.get('key') == 'value':
      return
    global dsw_global_data_store
    dsw_global_data_store[self.dsw_id] = self.dsw_data_store
    with open(dsw_file_name, 'wb') as file:
      pkl.dump(dsw_global_data_store, file)