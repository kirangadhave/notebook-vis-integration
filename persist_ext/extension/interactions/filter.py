from persist_ext.extension.interactions.selections import SELECTED

FILTERED_OUT = "__filtered_out"

def apply_filter(df, filter):
    filter_out = filter['direction'] == 'out'

    if filter_out:
        return df[~df[SELECTED]]
    else:
        return df[df[SELECTED]]
