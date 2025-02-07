import altair as alt
from pandas import DataFrame
from persist_ext.internals.data.idfy import ID_COLUMN
from persist_ext.internals.data.prepare import prepare
from persist_ext.internals.widgets.persist_output.widget import (
    DEFAULT_DATA_ACCESSOR,
    PersistWidget,
)
from persist_ext.internals.widgets.vegalite_chart.utils import (
    is_vega_altair_chart,
    pop_data_defs_from_charts_recursive,
)


def Persist(
    id: str,
    chart=None,
    data=None,
    df_name=None,
    id_column=ID_COLUMN,
    data_accessor=DEFAULT_DATA_ACCESSOR,
):
    if chart is None and data is None:
        raise ValueError(
            "Need a valid vega altair chart and/or dataframe to be provided."
        )

    # If visualizing charts
    if chart is not None:
        if data is None:  # if data is not pass explicitly
            chart_data = getattr(chart, "data", alt.Undefined)
            if chart_data is alt.Undefined:  # if chart does not have top level data
                raise ValueError(
                    """
                        Cannot infer dataset from vega altair specification. The data might be specified in subcharts.
                        Persist does not support such charts.
                        Please provide data at the top, or pass in the dataset explicitly as second arugment.
                    """
                )
            chart_data = prepare(chart_data, id_column)
            chart.data = chart_data
        else:  # if data is passed
            chart = pop_data_defs_from_charts_recursive(chart, [])
            chart.data = prepare(data, id_column)

        return PersistWidget(
            chart, df_name=df_name, id_column=id_column, data_accessor=data_accessor
        )

    if data is not None:  # if only showing dataframe
        data = prepare(data, id_column)
        return PersistWidget(
            id, data, df_name=df_name, id_column=id_column, data_accessor=data_accessor
        )


def PersistChart(chart, df_name=None, data=None):
    if not is_vega_altair_chart(chart):
        raise TypeError(f"'chart' must be an altair.Chart object. Got {type(chart)}")
    return Persist(chart=chart, data=data, df_name=df_name)


def PersistTable(data, id: str, df_name=None):
    if not isinstance(data, DataFrame):
        raise TypeError(f"'data' must be a pandas DataFrame. Got {type(data)}")
    return Persist(id=id, data=data, df_name=df_name)
