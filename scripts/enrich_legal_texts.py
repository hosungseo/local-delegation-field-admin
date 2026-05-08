#!/usr/bin/env python3
"""Regenerate app/data/delegation.json with law/decree original text blocks.

Uses law.go.kr Open API with OC=openclaw. Keeps the site static by embedding
fetched law/decree article text in the JSON bundle.
"""
import csv, json, pathlib, re, time, urllib.parse, urllib.request, xml.etree.ElementTree as ET
from collections import Counter, defaultdict

OC='openclaw'
ROOT=pathlib.Path(__file__).resolve().parents[1]
WORK=ROOT.parent
SRC=WORK/'tmp/gmail-iyang/delegation-full/core-185-implementation-package-20260509-0801-by-task.csv'
OUT=ROOT/'app/data/delegation.json'
ARTICLE_RE=re.compile(r'제\s*(\d+)\s*조(?:의\s*(\d+))?')

def norm(s): return re.sub(r'\s+',' ',(s or '').replace('\u3000',' ')).strip()

def get_xml(url, tries=3):
    last=None
    for _ in range(tries):
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
            return ET.fromstring(urllib.request.urlopen(req,timeout=30).read())
        except Exception as e:
            last=e; time.sleep(0.5)
    raise last

def law_search(query):
    url='http://www.law.go.kr/DRF/lawSearch.do?'+urllib.parse.urlencode({'OC':OC,'target':'law','type':'XML','query':query})
    root=get_xml(url)
    return [{c.tag:c.text for c in law} for law in root.findall('law')]

def law_xml(mst):
    url='http://www.law.go.kr/DRF/lawService.do?'+urllib.parse.urlencode({'OC':OC,'target':'law','type':'XML','MST':mst})
    return get_xml(url)

def article_key(no, ui=''):
    no=str(no or '').strip()
    ui=str(ui or '').strip()
    return f'{no}의{ui}' if ui else no

def article_label(key): return f'제{key}조'

def parse_articles(root):
    arts=[]
    for jo in root.findall('.//조문단위'):
        if (jo.findtext('조문여부') or '')!='조문':
            continue
        no=jo.findtext('조문번호') or ''
        ui=jo.findtext('조문가지번호') or ''
        key=article_key(no, ui if ui not in ('0','00','000') else '')
        title=norm(jo.findtext('조문제목') or '')
        body=norm(jo.findtext('조문내용') or '')
        paras=[]
        for hang in jo.findall('.//항'):
            pno=norm(hang.findtext('항번호') or '')
            pbody=norm(hang.findtext('항내용') or '')
            items=[]
            for ho in hang.findall('.//호'):
                ino=norm(ho.findtext('호번호') or '')
                ibody=norm(ho.findtext('호내용') or '')
                if ino or ibody: items.append({'number':ino,'text':ibody})
            if pno or pbody or items: paras.append({'number':pno,'text':pbody,'items':items})
        full=norm(' '.join([body]+[p['number']+' '+p['text']+' '+' '.join(i['number']+' '+i['text'] for i in p['items']) for p in paras]))
        arts.append({'key':key,'label':article_label(key),'title':title,'body':body,'paragraphs':paras,'text':full})
    return arts

def find_law_and_decree(law):
    hits=law_search(law)
    base=([x for x in hits if x.get('법령명한글')==law and x.get('법령구분명')=='법률'] or
          [x for x in hits if x.get('법령명한글')==law] or hits[:1])
    law_doc=None; decree_doc=None
    if base:
        b=base[0]; law_doc={'name':b.get('법령명한글') or law,'mst':b.get('법령일련번호') or '', 'kind':b.get('법령구분명') or ''}
    # exact 시행령, then contains law without spaces + 시행령
    d=[x for x in hits if x.get('법령명한글')==law+' 시행령']
    if not d:
        no_space=law.replace(' ','')
        d=[x for x in hits if (x.get('법령명한글') or '').replace(' ','')==no_space+'시행령']
    if d:
        e=d[0]; decree_doc={'name':e.get('법령명한글') or law+' 시행령','mst':e.get('법령일련번호') or '', 'kind':e.get('법령구분명') or ''}
    return law_doc, decree_doc

def evidence_article_keys(text):
    keys=[]
    for a,b in ARTICLE_RE.findall(text or ''):
        k=f'{int(a)}' + (f'의{int(b)}' if b else '')
        if k not in keys: keys.append(k)
    return keys

rows=list(csv.DictReader(SRC.open(encoding='utf-8-sig')))
laws=sorted(set(r['law'] for r in rows))
legal={}
for i,law in enumerate(laws,1):
    print(f'fetch {i}/{len(laws)} {law}', flush=True)
    entry={'law':law,'lawDoc':None,'decreeDoc':None,'fetchStatus':'ok','error':''}
    try:
        law_doc,decree_doc=find_law_and_decree(law)
        if law_doc and law_doc['mst']:
            arts=parse_articles(law_xml(law_doc['mst']))
            law_doc['articles']=arts
            law_doc['articleCount']=len(arts)
            law_doc['articlesByKey']={a['key']:a for a in arts}
        if decree_doc and decree_doc['mst']:
            arts=parse_articles(law_xml(decree_doc['mst']))
            decree_doc['articles']=arts
            decree_doc['articleCount']=len(arts)
            decree_doc['articlesByKey']={a['key']:a for a in arts}
        entry['lawDoc']=law_doc; entry['decreeDoc']=decree_doc
    except Exception as e:
        entry['fetchStatus']='error'; entry['error']=str(e)
    legal[law]=entry
    time.sleep(0.1)

records=[]
for r in rows:
    law_keys=evidence_article_keys(r.get('law_evidence',''))
    decree_keys=evidence_article_keys(r.get('decree_evidence',''))
    records.append({
        'id': f"{r['sheet']}-{r['row_no']}",
        'ministry': r['ministry'], 'law': r['law'], 'article': r['article'], 'task': r['task'], 'direction': r['direction'],
        'lawLocalTargetType': r['law_local_target_type'], 'lawLocalTargetLevel': r.get('law_local_target_level',''),
        'decreeGroup': r['decree_group'], 'taskCharacter': r['expanded_enforcement_primary'],
        'taskCategories': [x.strip() for x in r['expanded_enforcement_categories'].split(';') if x.strip()],
        'finalClass': r['final_class'], 'recommendedAction': r['recommended_action'], 'policyPackage': r.get('policy_package',''),
        'implementationPhase': r['implementation_phase'], 'phaseReason': r['phase_reason'],
        'lawEvidence': r['law_evidence'], 'decreeEvidence': r['decree_evidence'],
        'lawArticleKeys': law_keys, 'decreeArticleKeys': decree_keys,
    })

def top(counter, n=None): return [{'name':k,'count':v} for k,v in counter.most_common(n)]
def count(key, data=records): return Counter(x[key] for x in data)
summary={
    'totalTasks': len(records), 'totalLaws': len(set(r['law'] for r in records)),
    'lawTextReady': sum(1 for x in legal.values() if x.get('lawDoc') and x['lawDoc'].get('articleCount')),
    'decreeTextReady': sum(1 for x in legal.values() if x.get('decreeDoc') and x['decreeDoc'].get('articleCount')),
    'recordsWithLawArticleRefs': sum(1 for r in records if r['lawArticleKeys']),
    'recordsWithDecreeArticleRefs': sum(1 for r in records if r['decreeArticleKeys']),
    'byFinalClass': top(count('finalClass')), 'byLawLocalTargetType': top(count('lawLocalTargetType')),
    'byDecreeGroup': top(count('decreeGroup')), 'byTaskCharacter': top(count('taskCharacter')),
    'byPolicyPackage': top(count('policyPackage')), 'byImplementationPhase': top(count('implementationPhase')),
}
row_order=['시·도지사','시·도지사+시장·군수·구청장','시·도지사+시장·군수·구청장+지방자치단체의 장','지방자치단체의 장','교육감/교육장']
decree_order=['시행령 위임규정 없음','특별행정기관-지방해양수산청','특별행정기관-지방환경관서','특별행정기관-지방식약청','특별행정기관-지방고용노동관서','특별행정기관-기타/소속기관장']
char_order=['조사·검사·점검·측정','신고·등록·인허가·수리','시정·개선·조치·명령','감독·관리·사후관리','보고·자료요구·제출','제재·행정처분·청문','과태료·과징금·부과징수','안전·위해·사고 대응']
def matrix(row_key, col_key, rows_order, cols_order):
    c=Counter((r[row_key],r[col_key]) for r in records)
    return {'rows': rows_order, 'cols': cols_order, 'values': [[c[(ro,co)] for co in cols_order] for ro in rows_order]}
law_groups=defaultdict(list)
for r in records: law_groups[r['law']].append(r)
lawProfiles=[]
for law,rs in sorted(law_groups.items(), key=lambda kv:(-len(kv[1]),kv[0])):
    lawProfiles.append({'law':law,'count':len(rs),'ministries':sorted(set(r['ministry'] for r in rs)),'targets':top(count('lawLocalTargetType',rs)),'characters':top(count('taskCharacter',rs)),'decreeGroups':top(count('decreeGroup',rs)),'phases':top(count('implementationPhase',rs)),'sampleTasks':[r['task'] for r in rs[:4]]})
out={'meta':{'title':'현장집행·감독관리 사무 166건 탐색기','subtitle':'법률상 지자체 수임 가능 유형 × 시행령 현재 상태 × 사무 성격','generatedAt':'2026-05-09','source':str(SRC.relative_to(WORK)),'legalTextSource':'법제처 국가법령정보 API(law.go.kr)'},'summary':summary,'matrices':{'lawTargetByDecree':matrix('lawLocalTargetType','decreeGroup',row_order,decree_order),'lawTargetByCharacter':matrix('lawLocalTargetType','taskCharacter',row_order,char_order)},'lawProfiles':lawProfiles,'legalTexts':legal,'records':records}
OUT.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print('wrote', OUT, 'records', len(records), 'laws', len(legal), 'lawTextReady', summary['lawTextReady'], 'decreeTextReady', summary['decreeTextReady'])
