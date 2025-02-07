from pandas import DataFrame
import traitlets
from persist_ext.internals.widgets.base.output_processor import OutputProcessor
from persist_ext.internals.widgets.base.widget_with_generation import (
    WidgetWithGeneration,
)
from persist_ext.internals.widgets.vegalite_chart.utils import is_vega_altair_chart


Base = WidgetWithGeneration


def DEFAULT_DATA_ACCESSOR(obj):
    if isinstance(obj, DataFrame):
        return obj
    elif is_vega_altair_chart(obj):
        return obj.data
    return obj


class PersistWidget(Base):
    __widget_key = "persist_output"

    is_chart = traitlets.Bool(default_value=False).tag(sync=True)

    def __init__(self, id: str, obj, id_column, df_name, data_accessor, *args, **kwargs):
        is_chart = is_vega_altair_chart(obj)
        chart = None
        data = None

        if is_chart:
            chart = obj
        data = data_accessor(obj)

        if chart is None and data is None:
            raise ValueError("Invalid object passed to PersistWidget")

        self.output = OutputProcessor(widget=self)

        super(PersistWidget, self).__init__(
            id=id,
            df_name=df_name,
            id_column=id_column,
            chart=chart,
            data=data,
            widget_key=self.__widget_key,
            is_chart=is_chart,
            *args,
            **kwargs,
        )
