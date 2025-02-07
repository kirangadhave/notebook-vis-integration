import traitlets
import json
import traittypes
from persist_ext.internals.data.idfy import ID_COLUMN, idfy_dataframe
from persist_ext.internals.data.process_generate_dataset import process_generate_dataset
from persist_ext.internals.data.utils import is_float
from persist_ext.internals.widgets.base.widget_with_trrack import WidgetWithTrrack
from persist_ext.internals.widgets.interactions.annotation import (
    ANNOTATE_COLUMN_NAME,
    NO_ANNOTATION,
    PR_ANNOTATE,
)
from persist_ext.internals.widgets.interactions.categorize import NONE_CATEGORY_OPTION
from persist_ext.internals.widgets.interactions.selection import (
    SELECTED_COLUMN_BRUSH,
    SELECTED_COLUMN_INTENT,
)
from pandas.api.types import CategoricalDtype

SUPPORTED_COLUMN_TYPES = [
    "Int64",
    "Float64",
    "bool" "string",
    "datatime64[ns]",
    "category",
]


class WidgetWithData(WidgetWithTrrack):
    """
    Add _data_ and _persistent_data_ traitlets of Dataframe type
    """

    # --------------- Sort ---------------
    _persistent_data = traittypes.DataFrame()
    data = traittypes.DataFrame()
    processed_data = traittypes.DataFrame()
    data_values = traitlets.List(default_value=[]).tag(sync=True)

    # --------------- Columns ---------------
    # --- ID Column accessor
    id_column = traitlets.Unicode(default_value=ID_COLUMN).tag(sync=True)
    # --- All Column
    df_columns_all = traitlets.List(default_value=[]).tag(sync=True)
    # --- Set meta columns
    df_columns_meta = traitlets.List(
        default_value=[SELECTED_COLUMN_BRUSH, SELECTED_COLUMN_INTENT]
    ).tag(sync=True)
    # --- Set non meta columns
    df_columns_non_meta = traitlets.List(default_value=[]).tag(sync=True)
    df_columns_non_meta_with_annotations = traitlets.List(default_value=[]).tag(
        sync=True
    )
    # --- Map of type --> column_name[]
    df_columns_by_type = traitlets.Dict(default_value=dict()).tag(sync=True)
    # --- Map of column_name --> type
    df_column_types = traitlets.Dict(default_value=dict()).tag(sync=True)
    # --- category column options
    # Loaded from data
    df_category_columns = traitlets.Dict(default_value=dict()).tag(sync=True)

    # --------------- Selections ---------------
    # --- Row Selection State
    df_row_selection_state = traitlets.Dict(default_value=dict()).tag(sync=True)
    # --- Has Sele
    df_has_selections = traitlets.Bool(default_value=False).tag(sync=True)

    # --------------- Sort ---------------
    # --- Sorting State dict
    df_sorting_state = traitlets.List(default_value=[]).tag(sync=True)

    def __init__(self, id: str, data, id_column, *args, **kwargs):
        """
        Assign one copy of data to _data_ and one copy to `persistent_data`.
        Add id column if not present.
        Add a column to track selected rows and set it to False
        Add a column to track selected intents and set it to False
        Add an annotation column and set it to NO_ANNOTATION
        Try and infer object data types
        """

        data = data.copy(deep=True)

        if ID_COLUMN not in data:
            data = idfy_dataframe(data, id_column)

        data[SELECTED_COLUMN_BRUSH] = False
        data[SELECTED_COLUMN_INTENT] = False

        data[ANNOTATE_COLUMN_NAME] = NO_ANNOTATION

        data = self.__infer_object_data_types(data)

        super(WidgetWithData, self).__init__(
            id=id,
            data=data,
            _persistent_data=data.copy(deep=True),
            id_column=id_column,
            *args,
            **kwargs,
        )

    def __infer_object_data_types(self, data):
        """
        Try and infer object data types. object data types can be text strings,
        numbers, or mixed types.

        Could also be categories. For now if unique values of a string less than equals 5 infer as category

        Only ran once in the beginning
        """
        data = data.convert_dtypes()
        possible_conversions = ["Int64", "Float64", "string"]
        object_columns = data.select_dtypes(include=["object", "string"]).columns

        for column in object_columns:
            for type in possible_conversions:
                try:
                    data[column] = data[column].astype(type)
                    break
                except ValueError:
                    pass

            # If the dtype is string and unique values are less than 5
            # convert the column to categorical column sorted ascending
            if (
                column != ANNOTATE_COLUMN_NAME
                and data[column].dtype == "string"
                and data[column].nunique() <= 5
            ):
                categories = data[column].unique()
                sorted_categories = list(sorted(categories))
                if NONE_CATEGORY_OPTION not in sorted_categories:
                    sorted_categories.append(NONE_CATEGORY_OPTION)
                categoricalDType = CategoricalDtype(
                    categories=sorted_categories, ordered=True
                )
                data[column] = data[column].astype(categoricalDType)

        data[self.id_column] = data[self.id_column].astype("string")

        return data

    def copy_original_data(self):
        return self._persistent_data.copy(deep=True)

    @traitlets.observe("data")
    def _on_data_update(self, change):
        """
        Set all columns from dataframe
        Set non_meta columns after filtering meta_columns
        Set map of column_type --> column[]
        Set a map of column --> column_type
        Check sorting state, if it's empty then sort by id_column
        Set row selection state
        Set has selections
        Set values json
        """
        data = change.new

        with self.hold_sync():
            columns = list(data.columns)

            self.df_columns_all = columns
            self.df_columns_non_meta = list(
                filter(
                    lambda x: x not in self.df_columns_meta
                    and x not in [ANNOTATE_COLUMN_NAME],
                    columns,
                )
            )
            self.df_columns_non_meta_with_annotations = [
                *self.df_columns_non_meta,
                ANNOTATE_COLUMN_NAME,
            ]
            self.df_column_types = json.loads(data.dtypes.to_json(default_handler=str))

            self.df_columns_by_type = {
                str(dtype): data.select_dtypes(include=[dtype]).columns.tolist()
                for dtype in data.dtypes
            }

            categorical_column_record = dict()

            if "category" not in self.df_columns_by_type:
                cat = self.df_columns_by_type.copy()
                cat["category"] = []
                self.df_columns_by_type = cat

            for cat_col_name in self.df_columns_by_type["category"]:
                cat_col = data[cat_col_name]

                categorical_column_record[cat_col_name] = {
                    "name": cat_col_name,
                    "options": cat_col.cat.categories.tolist(),
                    "ordered": cat_col.cat.ordered,
                }

            self.df_category_columns = categorical_column_record

            if len(self.interactions) == 1:
                self.df_sorting_state = []
                data = data.sort_values(
                    by=self.id_column,
                    ascending=True,
                    key=(
                        lambda x: x.astype("Float64") if x.apply(is_float).all() else x
                    ),
                )

            temp_sel_column = "SELECTED"
            selected_data = data[[self.id_column]]
            selected_data.loc[:, [temp_sel_column]] = (
                data[SELECTED_COLUMN_BRUSH] | data[SELECTED_COLUMN_INTENT]
            )
            selected_data = (
                selected_data[selected_data[temp_sel_column]]
                .set_index(self.id_column)[temp_sel_column]
                .to_dict()
            )

            self.df_row_selection_state = selected_data
            self.df_has_selections = len(self.df_row_selection_state) > 0

            data_c = data.rename(columns={ANNOTATE_COLUMN_NAME: PR_ANNOTATE})

            if (
                PR_ANNOTATE in data_c
                and data_c[PR_ANNOTATE].apply(lambda x: x == NO_ANNOTATION).all()
            ):
                data_c = data_c.drop(columns=[PR_ANNOTATE])

            self.data_values = json.loads(data_c.to_json(orient="records"))
            self.processed_data = process_generate_dataset(data_c)


# NOTE: To add interactions
