from io import BytesIO
import pandas as pd
from pandas.api.types import CategoricalDtype
import traitlets
from persist_ext.internals.widgets.base.widget_with_chart import (
    WidgetWithChart,
    copy_altair_chart,
)


def _id(interaction):
    if "id" not in interaction:
        raise Exception("Interaction does not have an id")
    return interaction["id"]


class InteractionApplyCache:
    def __init__(self):
        self.cache = dict()

        self.last_cache_hit_key = None

    def reset_cache_hit(self):
        self.set_cache_hit()

    def set_cache_hit(self, interaction=None):
        if interaction is None:
            self.last_cache_hit_key = None
        else:
            id = _id(interaction)
            self.last_cache_hit_key = id

    def has(self, interaction):
        return _id(interaction) in self.cache

    def get(self, key):
        if key not in self.cache:
            raise Exception("Key not in cache")

        return self.from_cache(key)

    def save(self, interaction, data, chart):
        id = _id(interaction)
        data, cat_types_dict, chart = self.to_cache(data, chart)
        self.cache[id] = (data, cat_types_dict, chart)

    def from_cache(self, id):
        data, cat_types_dict, chart = self.cache[id]
        data = pd.read_parquet(BytesIO(data))

        for k, v in cat_types_dict.items():
            data[k] = data[k].astype(
                CategoricalDtype(categories=v["categories"], ordered=v["ordered"])
            )

        chart = copy_altair_chart(chart)
        return data, chart

    def to_cache(self, data, chart):
        cat_type_dict = dict()

        for col in data.select_dtypes(include=["category"]):
            series = data[col]

            cat_type_dict[col] = {
                "categories": series.cat.categories.tolist(),
                "ordered": series.cat.ordered,
            }

        data = data.to_parquet(compression="brotli")
        chart = copy_altair_chart(chart)
        return data, cat_type_dict, chart


class WidgetWithInteractions(WidgetWithChart):
    interactions = traitlets.List().tag(sync=True)
    is_applying = traitlets.Bool(default_value=False).tag(sync=True)

    def __init__(self, id: str, *args, **kwargs):
        super(WidgetWithInteractions, self).__init__(id=id, *args, **kwargs)
        self.update_dynamic_df = None
        self.cache = InteractionApplyCache()

    @traitlets.observe("interactions")
    def _on_interaction_change(self, change):
        interactions = change.new

        self._interaction_change(interactions)
        self.finish()

    def _interaction_change(self, interactions):
        self.is_applying = True

        data, chart = self.copy_original_data(), self.copy_original_chart()

        try:
            with self.hold_sync():
                self.df_sorting_state = []
                data, chart = self._apply_interactions(interactions, data, chart)
                self.data = data
                if chart is not None:
                    chart.data = data
                    self.chart = chart
        except Exception as e:
            raise e
        finally:
            self.is_applying = False

    def _apply_interactions(self, interactions, data, chart):
        for interaction in interactions:
            if self.cache.has(interaction):
                self.cache.set_cache_hit(interaction)
            else:
                if self.cache.last_cache_hit_key is not None:
                    data, chart = self.cache.get(self.cache.last_cache_hit_key)
                    self.cache.reset_cache_hit()

                _type = interaction["type"]
                fn_name = f"_apply_{_type}"

                if hasattr(self.output, fn_name):
                    fn = getattr(self.output, fn_name)

                    data, chart = fn(interaction, data, chart)

                    self.cache.save(interaction, data, chart)
                else:
                    raise NotImplementedError(
                        f"Apply method: {fn_name}, not found on output class 'BaseOutputObject'"
                    )

        if self.cache.last_cache_hit_key is not None:
            data, chart = self.cache.get(self.cache.last_cache_hit_key)

        return data, chart

    def finish(self):
        pass
