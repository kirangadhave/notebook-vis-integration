from pandas import DataFrame
import traitlets
from IPython import get_ipython
from persist_ext.internals.data.process_generate_dataset import process_generate_dataset
from persist_ext.internals.widgets.base.widget_with_intents import WidgetWithIntents

GLOBAL_GENERATION_COUNT = dict()
PERSIST_DEFAULT_DYNAMIC_NAME = "persist_df"


class WidgetWithGeneration(WidgetWithIntents):
    gdr_record = traitlets.Dict(allow_none=True, default_value=None).tag(sync=True)
    gdr_dynamic_name = traitlets.Unicode("").tag(sync=True)
    gdr_dynamic_counter = traitlets.Int().tag(sync=True)
    gdr_signal = traitlets.Dict({}).tag(sync=True)
    gdr_has_synced = traitlets.Bool(False).tag(sync=True)

    def __init__(self, id: str, df_name, *args, **kwargs):
        self.gdr_df_name_provided = True

        if df_name is None:
            self.gdr_df_name_provided = False
            df_name = PERSIST_DEFAULT_DYNAMIC_NAME
        else:
            # check if df_name is valid python variable name
            if not df_name.isidentifier():
                raise ValueError(f"{df_name} is not a valid python variable name")

        if df_name not in GLOBAL_GENERATION_COUNT:
            GLOBAL_GENERATION_COUNT[df_name] = 0
        gdr_dynamic_counter = GLOBAL_GENERATION_COUNT[df_name] + 1

        super(WidgetWithGeneration, self).__init__(
            id=id,
            gdr_dynamic_name=df_name,
            gdr_dynamic_counter=gdr_dynamic_counter,
            *args,
            **kwargs,
        )

    @traitlets.observe("gdr_dynamic_counter")
    def _on_counter(self, change):
        new_c = change.new
        if isinstance(new_c, str):
            new_c = int(new_c)

        if self.gdr_dynamic_name not in GLOBAL_GENERATION_COUNT:
            GLOBAL_GENERATION_COUNT[self.gdr_dynamic_name] = 0

        GLOBAL_GENERATION_COUNT[self.gdr_dynamic_name] = new_c

    @traitlets.observe("gdr_record")
    def _on_gdr_record_update(self, change):
        old_records = change.old
        record = change.new
        if old_records is not None:
            for key, rec in old_records.items():
                if "isDynamic" in rec and rec["isDynamic"]:
                    continue
                elif does_var_exist(key):
                    del get_ipython().user_ns[key]

        with self.hold_sync():
            if not self.gdr_has_synced:
                self.gdr_has_synced = True
            else:
                return

            if not self.gdr_df_name_provided:
                for dn, dr in record.copy().items():
                    if dr["isDynamic"] and not dn.startswith(
                        f"{self.gdr_dynamic_name}_"
                    ):
                        del self.gdr_record[dn]

                # recreate dynamic
                has_no_dynamic = (
                    len(
                        list(filter(lambda x: x["isDynamic"], self.gdr_record.values()))
                    )
                    == 0
                )

                if has_no_dynamic:
                    record = self._create_dynamic_df(
                        self.gdr_dynamic_name,
                        with_counter=not self.gdr_df_name_provided,
                    )
            elif self.gdr_df_name_provided:
                # Check if override is set to true. If override is found, then remove dynamic record from input
                for dn, dr in record.copy().items():
                    if dr["isDynamic"]:
                        del self.gdr_record[dn]

                # recreate dynamic
                record = self._create_dynamic_df(
                    self.gdr_dynamic_name, with_counter=not self.gdr_df_name_provided
                )
            self.gdr_record = record

            # if record found.
            for rec in self.gdr_record.values():
                if rec["isDynamic"]:
                    self._only_create_dynamic_df(rec["dfName"])
                else:
                    self._only_create_static_df(rec)

    @traitlets.observe("gdr_signal")
    def _on_signal(self, change):
        value = change.new

        record = value["record"]

        post = None
        if "post" in value:
            post = value["post"]

        self._create_static_df(record, post)

    def _only_create_static_df(self, record):
        df_name = record["dfName"]
        interactions = record["interactions"]
        last_interaction = interactions[-1]

        cache = self.cache

        if not cache.has(last_interaction):
            self._apply_interactions(
                interactions, self.copy_original_data(), self.copy_original_chart()
            )

        data, _ = cache.get(last_interaction["id"])
        get_ipython().user_ns[df_name] = process_generate_dataset(data)

    def _only_create_dynamic_df(self, df_name):
        update_fn = get_dynamic_df_update_fn(df_name)

        self.observe(update_fn, "processed_data")

        update_fn(self.processed_data)

    def _create_dynamic_df(self, df_name, with_counter=True):
        if with_counter:
            i = 1

            def create_df_name(count):
                return f"{df_name}_{count}"

            while does_var_exist(create_df_name(i)):
                i += 1

            df_name = create_df_name(i)

        self._only_create_dynamic_df(df_name)

        gen_record = self.gdr_record.copy()
        gen_record[df_name] = {"dfName": df_name, "isDynamic": True}
        return gen_record

    def _create_static_df(self, record, post=False):
        # Set initial data as None
        if record["isDynamic"]:
            pass

        self._only_create_static_df(record)

        df_name = record["dfName"]

        with self.hold_sync():
            gen_record = self.gdr_record.copy()
            gen_record[df_name] = record
            self.gdr_record = gen_record

        self.send(
            {
                "msg": {
                    "type": "df_created",
                    "record": record,
                    "post": post if post else "none",
                }
            }
        )


def does_var_exist(var_name):
    return var_name in get_ipython().user_ns


def get_dynamic_df_update_fn(df_name):
    def _fn(data):
        if not isinstance(data, DataFrame):
            data = data.new
        get_ipython().user_ns[df_name] = data

    return _fn
