import pandas as pd

from persist_ext.internals.dataframe.idfy import idfy_dataframe
from persist_ext.internals.dataframe.validate import is_dataframe_or_url


def prepare(df):
    df = is_dataframe_or_url(df)  # check if is valid dataframe

    df = idfy_dataframe(df)  # add id column

    return df
