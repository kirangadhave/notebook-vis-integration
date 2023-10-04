import json

import anywidget
import traitlets
from pandas import DataFrame


class WidgetWithTrrack(anywidget.AnyWidget):
    trrack = traitlets.Dict().tag(sync=True)
    interactions = traitlets.List().tag(sync=True)
    data = traitlets.Instance(DataFrame)
    df_columns = traitlets.List().tag(sync=True)
    df_values = traitlets.List().tag(sync=True)

    renamed_column_record = {}

    def __init__(self, *args, **kwargs):
        if type(self) is WidgetWithTrrack:
            raise NotImplementedError("Cannot create instance of this base class")

        super(WidgetWithTrrack, self).__init__(*args, **kwargs)

    @traitlets.observe("data")
    def _handle_data_update(self, change):
        new_data = change.new

        columns = list(filter(lambda x: x != "index", new_data.columns))
        values = json.loads(new_data[columns].to_json(orient="records"))

        with self.hold_sync():
            self.df_columns = columns
            self.df_values = values

    def rename_column(self, previous_column_name, new_column_name):
        self.renamed_column_record[previous_column_name] = new_column_name
        self.data = self.data.rename(columns={previous_column_name: new_column_name})


class BodyWidgetBase(WidgetWithTrrack):
    def __init__(self, data, **kwargs):
        if type(self) is BodyWidgetBase:
            raise NotImplementedError("Cannot create instance of this base class")

        super(BodyWidgetBase, self).__init__(data=data, **kwargs)