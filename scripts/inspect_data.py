import pandas as pd, pathlib, json
SRC = pathlib.Path.home() / "Downloads" / "P2P_DATASET"
files = ["buildings","calendar","daily_summary","hourly_streams","manual_logs","waste_events_train","waste_events_test"]
for f in files:
    p = SRC / f"{f}.xlsx"
    df = pd.read_excel(p)
    print("="*70)
    print(f"{f}  rows={len(df)}  cols={len(df.columns)}")
    print("columns:", list(df.columns))
    print("dtypes:")
    for c in df.columns:
        print(f"   {c}: {df[c].dtype}")
    print("head:")
    with pd.option_context('display.max_columns', None, 'display.width', 200):
        print(df.head(3).to_string())
    if f == "waste_events_train":
        # find label col
        for cand in ["waste_class","category","class","label"]:
            if cand in df.columns:
                print("LABEL COL:", cand)
                print(df[cand].value_counts().to_string())
    if f == "manual_logs":
        for c in ["logger_role","stream","unit","building"]:
            if c in df.columns:
                print(f"UNIQUE {c}:", sorted(df[c].dropna().astype(str).unique().tolist())[:40])
    if f == "calendar":
        for c in ["day_type","event"]:
            if c in df.columns:
                print(f"UNIQUE {c}:", df[c].dropna().astype(str).unique().tolist()[:30])
