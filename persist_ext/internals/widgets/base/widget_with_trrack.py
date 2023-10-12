import anywidget
import traitlets

from persist_ext.internals.dataframe.idfy import ID_COLUMN
from persist_ext.internals.utils.entry_paths import get_widget_esm_css
from persist_ext.internals.widgets.vegalite_chart.selection import SELECTED_COLUMN


class WidgetWithTrrack(anywidget.AnyWidget):
    trrack = traitlets.Dict().tag(sync=True)  # Trrack graph

    interactions = traitlets.List().tag(sync=True)  # Interactions from current

    # list of all columns in the data
    df_columns = traitlets.List().tag(sync=True)
    # columns that represent meta information after applying interactions
    df_meta_columns = traitlets.List([ID_COLUMN, SELECTED_COLUMN]).tag(sync=True)
    # Non-meta columns of the data
    df_non_meta_columns = traitlets.List().tag(sync=True)

    # Values of the data
    df_values = traitlets.List().tag(sync=True)

    renamed_column_record = {}

    def __init__(self, widget_key=None, *args, **kwargs):
        if widget_key is None:
            raise ValueError("widget_key cannot be none")

        esm, css = get_widget_esm_css(widget_key)
        self._esm = esm
        self._css = css

        if type(self) is WidgetWithTrrack:
            raise NotImplementedError("Cannot create instance of this base class")

        super(WidgetWithTrrack, self).__init__(*args, **kwargs)
