import pathlib, numpy as np, pandas as pd
from sklearn.model_selection import StratifiedKFold
from sklearn.ensemble import RandomForestClassifier
ROOT=pathlib.Path(__file__).resolve().parents[1]; RAW=ROOT/"data"/"raw"
RAWF=["weight_g","moisture_pct","metal_signal","transparency","acoustic_hardness"]
tr=pd.read_excel(RAW/"waste_events_train.xlsx")
X=tr[RAWF].values.astype(float); y=tr.category.values
skf=StratifiedKFold(5,shuffle=True,random_state=42)
oof_pred=np.empty(len(y),dtype=object); oof_conf=np.zeros(len(y))
for tri,tei in skf.split(X,y):
    m=RandomForestClassifier(n_estimators=400,min_samples_leaf=1,max_features="sqrt",
        class_weight="balanced_subsample",random_state=42,n_jobs=-1).fit(X[tri],y[tri])
    proba=m.predict_proba(X[tei]); cls=m.classes_
    oof_pred[tei]=cls[np.argmax(proba,1)]; oof_conf[tei]=proba.max(1)
acc=(oof_pred==y).mean()
print(f"Overall OOF accuracy: {acc:.4f}")
for thr in [0.4,0.5,0.6,0.7]:
    mask=oof_conf>=thr
    cov=mask.mean(); a=(oof_pred[mask]==y[mask]).mean()
    print(f"  conf>={thr:.1f}: coverage={cov:.3f}  accuracy_on_covered={a:.4f}")
