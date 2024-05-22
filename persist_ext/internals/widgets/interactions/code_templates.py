import jinja2

jinja_env = jinja2.Environment(undefined=jinja2.DebugUndefined)

CREATE_FUNC_DEF = "def create_{{df_name}}(df):"

COPY_DF = "{{indent}}df = df.copy(deep=True)"

ADD_IDS = """
{{indent}}# Add {{id_col}} as the ID column
{{indent}}df.insert(0, {{id_col}}, df.index + 1)
{{indent}}df[{{id_col}}] = df[{{id_col}}].astype(str)"""

ADD_SELECTION_COLUMN = """
{{indent}}# Add selection column
{{indent}}df["{{selection_column}}"] = False\n"""

RETURN_DF = "\n{{indent}}return df"


def get_selection_code(interaction):
    brush_type = interaction["brush_type"]

    if brush_type == "non-vega":
        name = interaction["name"]
        values = interaction["value"]
        return jinja_env.from_string(
            '{{indent}}df.loc[df["{{name}}"].isin({{values}}), "{{selection_column}}"] = True'
        ).render({"name": name, "values": values})
    else:
        raise ValueError(f"Brush type {brush_type} not supported")


def get_filter_code(interaction):
    direction = interaction["direction"]

    code = """{{indent}}# Filter data
    {%- if direction == "in" %}
{{indent}}df = df[df["{{selection_column}}"]]
    {%- else %}
{{indent}}df = df[~df["{{selection_column}}"]]
    {%- endif %}
{{indent}}df["{{selection_column}}"] = False\n"""

    return jinja_env.from_string(code).render({"direction": direction})


def get_rename_columns_code(interaction):
    rename_column_map = interaction["renameColumnMap"]

    code = """{{indent}}# Rename column
{{indent}}df = df.rename(columns={{rename_column_map}})\n"""

    return jinja_env.from_string(code).render({"rename_column_map": rename_column_map})


def get_drop_columns_code(interaction):
    columns = interaction["columns"]

    if columns is None:
        return ""

    code = """{{indent}}# Drop columns
{{indent}}df = df.drop(columns={{columns}})\n"""

    return jinja_env.from_string(code).render({"columns": columns})
