import pathlib, numpy as np, pandas as pd
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier
ROOT=pathlib.Path(__file__).resolve().parents[1]; RAW=ROOT/"data"/"raw"
RAWF=["weight_g","moisture_pct","metal_signal","transparency","acoustic_hardness"]
def eng(df):
    d=df.copy(); m=d.moisture_pct/100; hard=d.acoustic_hardness; tr=d.transparency; me=d.metal_signal; w=d.weight_g
    d["tr_hard"]=tr*hard; d["tr_minus_hard"]=tr-hard; d["opacity_soft"]=(1-tr)*(1-hard)
    d["wet_soft"]=m*(1-hard); d["metal_norm"]=me/(1+me); d["metal_hard"]=(me/(1+me))*hard
    d["dry_opaque_light"]=(1-m)*(1-tr)*(1/(1+w/100)); d["log_w"]=np.log1p(w)
    d["clear_light"]=tr*(1/(1+w/100))
    return d
tr=eng(pd.read_excel(RAW/"waste_events_train.xlsx"))
ENG=["tr_hard","tr_minus_hard","opacity_soft","wet_soft","metal_norm","metal_hard","dry_opaque_light","log_w","clear_light"]
y=tr.category.values
skf=StratifiedKFold(5,shuffle=True,random_state=42)
for name,feats in [("raw",RAWF),("raw+eng",RAWF+ENG),("eng_only",ENG)]:
    X=tr[feats].values.astype(float)
    for mdl_name,mdl in [
        ("RF500", RandomForestClassifier(n_estimators=500,min_samples_leaf=1,max_features="sqrt",class_weight="balanced_subsample",random_state=42,n_jobs=-1)),
        ("ET600", ExtraTreesClassifier(n_estimators=600,min_samples_leaf=1,max_features="sqrt",class_weight="balanced",random_state=42,n_jobs=-1)),
    ]:
        cv=cross_val_score(mdl,X,y,cv=skf,scoring="accuracy",n_jobs=-1)
        print(f"{name:10s} {mdl_name:7s} cv={cv.mean():.4f}+/-{cv.std():.4f}")
