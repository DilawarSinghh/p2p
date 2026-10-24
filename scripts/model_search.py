import pathlib, numpy as np, pandas as pd
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.ensemble import (RandomForestClassifier, ExtraTreesClassifier,
                              GradientBoostingClassifier, HistGradientBoostingClassifier)
from sklearn.metrics import accuracy_score, classification_report

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
RAWF = ["weight_g","moisture_pct","metal_signal","transparency","acoustic_hardness"]

def engineer(df):
    d=df.copy(); m=d.moisture_pct; hard=d.acoustic_hardness; tr=d.transparency; me=d.metal_signal; w=d.weight_g
    d["wetness_x_soft"]=(m/100)*(1-hard); d["clear_x_hard"]=tr*hard
    d["metal_x_hard"]=(me/(1+me))*hard; d["dry_light"]=(1-m/100)*(1/(1+w/100)); d["opacity"]=1-tr
    d["log_w"]=np.log1p(w); d["metal_bin"]=(me>1).astype(int)
    return d

tr = engineer(pd.read_excel(RAW/"waste_events_train.xlsx"))
FE = RAWF + ["wetness_x_soft","clear_x_hard","metal_x_hard","dry_light","opacity","log_w","metal_bin"]
X = tr[FE].values.astype(float); y = tr["category"].values
Xtr,Xte,ytr,yte = train_test_split(X,y,test_size=0.2,random_state=42,stratify=y)

models = {
 "RF300": RandomForestClassifier(n_estimators=300,max_depth=None,min_samples_leaf=1,class_weight="balanced_subsample",random_state=42,n_jobs=-1),
 "ET400": ExtraTreesClassifier(n_estimators=400,max_depth=None,min_samples_leaf=1,class_weight="balanced",random_state=42,n_jobs=-1),
 "HGB":   HistGradientBoostingClassifier(max_iter=400,learning_rate=0.08,max_depth=None,max_leaf_nodes=63,l2_regularization=1.0,random_state=42),
 "HGB_deep": HistGradientBoostingClassifier(max_iter=600,learning_rate=0.05,max_leaf_nodes=127,l2_regularization=0.5,random_state=42),
}
for name,m in models.items():
    m.fit(Xtr,ytr); acc=accuracy_score(yte,m.predict(Xte))
    print(f"{name:10s} holdout_acc={acc:.4f}")
