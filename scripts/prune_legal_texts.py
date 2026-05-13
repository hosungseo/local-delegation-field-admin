#!/usr/bin/env python3
from __future__ import annotations
import json, pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
P=ROOT/'app/data/delegation.json'

def prune_doc(doc, keys):
    if not doc: return doc
    by=doc.get('articlesByKey') or {}
    keep=[]
    seen=set()
    for k in keys:
        if k in by and k not in seen:
            keep.append(by[k]); seen.add(k)
    # fallback: keep first two only when there are no matched keys for that doc, so UI can still show a small sample
    if not keep and doc.get('articles'):
        keep=doc['articles'][:2]
    nd={k:v for k,v in doc.items() if k not in ('articles','articlesByKey')}
    nd['articleCount']=doc.get('articleCount', len(doc.get('articles') or []))
    nd['articles']=keep
    nd['articlesByKey']={a['key']:a for a in keep if 'key' in a}
    nd['prunedForStaticBundle']=True
    return nd

def main():
    d=json.load(open(P))
    law_keys={}; dec_keys={}
    for r in d['records']:
        law_keys.setdefault(r['law'],set()).update(r.get('lawArticleKeys') or [])
        dec_keys.setdefault(r['law'],set()).update(r.get('decreeArticleKeys') or [])
    for law,entry in (d.get('legalTexts') or {}).items():
        entry['lawDoc']=prune_doc(entry.get('lawDoc'), law_keys.get(law,set()))
        entry['decreeDoc']=prune_doc(entry.get('decreeDoc'), dec_keys.get(law,set()))
    d.setdefault('meta',{})['legalTextBundle']='pruned-to-referenced-articles'
    open(P,'w').write(json.dumps(d,ensure_ascii=False,separators=(',',':')))
    print(P, P.stat().st_size)
if __name__=='__main__': main()
