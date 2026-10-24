import pathlib, numpy as np, pandas as pd
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.ensemble import RandomForestClassifier
ROOT=pathlib.Path(__file__).resolve().parents[1]; RAW=ROOT/"data"/"raw"
RAWF=["weight_g","moisture_pct","metal_signal","transparency","acoustic_hardness"]
tr=pd.read_excel(RAW/"waste_events_train.xlsx")
pd.set_option("display.width",200,"display.max_columns",None)
print("Per-class feature means:")
print(tr.groupby("category")[RAWF].mean().round(2).to_string())
print("\nPer-class feature std:")
print(tr.groupby("category")[RAWF].std().round(2).to_string())
# Overlap between paper and plastic
for a,b in [("paper_cardboard","plastic")]:
    sub=tr[tr.category.isin([a,b])]
    print(f"\n{a} vs {b} means:")
    print(sub.groupby("category")[RAWF].agg(['mean','std']).round(2).to_string())
# CV accuracy (5-fold) to see true central estimate
X=tr[RAWF].values.astype(float); y=tr.category.values
rf=RandomForestClassifier(n_estimators=300,min_samples_leaf=1,class_weight="balanced_subsample",random_state=42,n_jobs=-1)
cv=cross_val_score(rf,X,y,cv=StratifiedKFold(5,shuffle=True,random_state=42),scoring="accuracy")
print(f"\n5-fold CV accuracy (raw 5 feats): {cv.mean():.4f} +/- {cv.std():.4f}  folds={np.round(cv,4)}")
