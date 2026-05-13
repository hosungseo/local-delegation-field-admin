#!/usr/bin/env python3
from __future__ import annotations
import csv, json, pathlib, re, zipfile, xml.etree.ElementTree as ET
from collections import Counter, defaultdict

ROOT=pathlib.Path(__file__).resolve().parents[1]
WORK=ROOT.parent
XLSX=WORK/'inbox/local-delegation-557/260512_3차일괄이양_의견조회_대상_특행포함_557개.xlsx'
FORMAL804=WORK/'tmp/gmail-iyang/delegation-full/formal-law-decree-classification-804-20260510-0836/all-804-formal-classification.csv'
OUT=ROOT/'app/data/delegation.json'
LEGAL_CACHE=ROOT/'app/data/legal-text-cache.json'

def norm(s):
    return re.sub(r'\s+',' ',str(s or '').replace('\u3000',' ')).strip()

def key(s):
    return re.sub(r'[^0-9A-Za-z가-힣]+','',norm(s)).lower()

def read_xlsx(path):
    ns={'a':'http://schemas.openxmlformats.org/spreadsheetml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
    z=zipfile.ZipFile(path)
    shared=[]
    if 'xl/sharedStrings.xml' in z.namelist():
        root=ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in root.findall('a:si',ns):
            shared.append(''.join(t.text or '' for t in si.findall('.//a:t',ns)))
    wb=ET.fromstring(z.read('xl/workbook.xml'))
    rels=ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    rmap={rel.attrib['Id']:rel.attrib['Target'] for rel in rels}
    sh=wb.find('.//a:sheet',ns)
    target=rmap[sh.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']].lstrip('/')
    if not target.startswith('xl/'): target='xl/'+target
    root=ET.fromstring(z.read(target))
    def colnum(ref):
        letters=re.match(r'[A-Z]+',ref).group(0); n=0
        for ch in letters: n=n*26+ord(ch)-64
        return n
    rows=[]
    for row in root.findall('.//a:sheetData/a:row',ns):
        vals={}
        for c in row.findall('a:c',ns):
            v=c.find('a:v',ns)
            if v is None: val=''
            else:
                raw=v.text or ''
                val=shared[int(raw)] if c.attrib.get('t')=='s' and raw.isdigit() else raw
            vals[colnum(c.attrib['r'])]=val
        if vals:
            maxc=max(vals)
            rows.append([vals.get(i,'') for i in range(1,maxc+1)])
    header=[norm(x) for x in rows[0]]
    data=[]
    for r in rows[1:]:
        d={header[i]: norm(r[i] if i < len(r) else '') for i in range(len(header))}
        if any(d.values()): data.append(d)
    return data

def load_804(path):
    rows=[]
    with open(path,encoding='utf-8-sig',newline='') as f:
        for r in csv.DictReader(f): rows.append({k:norm(v) for k,v in r.items()})
    by_exact={}
    by_law_article=defaultdict(list)
    for r in rows:
        by_exact[(key(r['law']),key(r['article']),key(r['task']))]=r
        by_law_article[(key(r['law']),key(r['article']))].append(r)
    return rows, by_exact, by_law_article

def target_type(direction):
    d=norm(direction)
    types=[]
    if '시·도' in d or '시도' in d: types.append('시·도지사')
    if '시·군·구' in d or '시군구' in d: types.append('시장·군수·구청장')
    if '지방자치단체' in d: types.append('지방자치단체의 장')
    if '교육' in d: types.append('교육감/교육장')
    # preserve order unique
    out=[]
    for t in types:
        if t not in out: out.append(t)
    return '+'.join(out) if out else '지자체 대상 없음/미확인'

def phase_from_formal(fc):
    if fc.startswith('F1'): return 'F1-형식상전환후보'
    if fc.startswith('F2'): return 'F2-형식상신설검토후보'
    if fc.startswith('F3'): return 'F3-직접권한·기위임'
    if fc.startswith('F5'): return 'F5-형식연결보완'
    if fc.startswith('F4'): return 'F4-법령명정규화'
    return fc or '미분류'

def decree_group_from_phase(phase):
    return {
        'F1-형식상전환후보':'시행령상 비지자체·특행기관 등',
        'F2-형식상신설검토후보':'시행령 대응규정 없음/미확인',
        'F3-직접권한·기위임':'시행령상 지자체 수임 또는 직접권한',
        'F5-형식연결보완':'형식 연결 보완필요',
        'F4-법령명정규화':'법령명 정규화 필요',
    }.get(phase,'미분류')

def reason(phase):
    return {
        'F1-형식상전환후보':'법률상 지자체 형식은 있으나 시행령 수임자가 비지자체·특행기관 등으로 보이는 전환 검토 대상',
        'F2-형식상신설검토후보':'법률상 지자체 형식은 있으나 시행령 대응 수임 규정이 없거나 미확인인 신설 검토 대상',
        'F3-직접권한·기위임':'시행령 형식상 이미 지자체 수임/직접권한 신호가 있어 별도표기 또는 기위임 확인 대상',
        'F5-형식연결보완':'법률-시행령 형식 연결은 있으나 조문명·대상·인용관계 보완 확인이 필요한 대상',
        'F4-법령명정규화':'법령명 정규화 후 재매칭이 필요한 대상',
    }.get(phase,'형식 재검토 필요')

def counts(items, field):
    c=Counter(r[field] for r in items)
    return [{'name':k,'count':v} for k,v in c.most_common()]

def matrix(items,row_field,col_field,row_order=None,col_order=None):
    rows=row_order or list(dict.fromkeys(r[row_field] for r in items))
    cols=col_order or list(dict.fromkeys(r[col_field] for r in items))
    vals=[]
    for ro in rows:
        vals.append([sum(1 for r in items if r[row_field]==ro and r[col_field]==co) for co in cols])
    return {'rows':rows,'cols':cols,'values':vals}

def main():
    xrows=read_xlsx(XLSX)
    rows804, exact, lawart=load_804(FORMAL804)
    records=[]; match_counts=Counter(); unmatched=[]
    for i,x in enumerate(xrows,1):
        law=x.get('근거법령',''); article=x.get('조항',''); task=x.get('단위사무명','')
        m=exact.get((key(law),key(article),key(task)))
        method='exact'
        if not m:
            cands=lawart.get((key(law),key(article)),[])
            if len(cands)==1:
                m=cands[0]; method='law+article'
        if not m:
            method='fallback'; unmatched.append({'id':i,'law':law,'article':article,'task':task})
        match_counts[method]+=1
        phase=phase_from_formal(m.get('formal_class','') if m else '') if m else 'F2-형식상신설검토후보'
        rec={
            'id':f'{i:03d}',
            'ministry':x.get('소관부처','') or (m.get('ministry','') if m else ''),
            'law':law,
            'article':article,
            'task':task,
            'direction':x.get('이양방향',''),
            'lawLocalTargetType':m.get('law_local_target_type','') if m else target_type(x.get('이양방향','')),
            'decreeGroup':m.get('all_law_classification','') if False else decree_group_from_phase(phase),
            'taskCharacter':phase.replace('F1-','').replace('F2-','').replace('F3-','').replace('F5-','').replace('후보','').replace('·','·'),
            'finalClass':phase,
            'recommendedAction':reason(phase),
            'policyPackage':'557개 의견조회 대상 F분류',
            'implementationPhase':phase,
            'phaseReason':reason(phase),
            'lawEvidence':('법률상 지자체 대상: '+(m.get('law_local_target_type','') if m else target_type(x.get('이양방향',''))) + (' · 근거: '+m.get('law_delegation_articles','') if m and m.get('law_delegation_articles') else '')),
            'decreeEvidence':(('시행령 대상: '+m.get('decree_local_target_type','')+' · 근거: '+m.get('decree_delegation_articles','')) if m else '557개 엑셀 기준 신규/미매칭 항목: 시행령 대응규정 별도 확인 필요'),
            'lawArticleKeys':[],
            'decreeArticleKeys':[],
            'sourceStatus':x.get('추진현황',''),
            'specialAdmin':x.get('특행여부',''),
            'matchMethod':method,
        }
        records.append(rec)
    laws=defaultdict(list)
    for r in records: laws[r['law']].append(r)
    lawProfiles=[]
    for law,rs in sorted(laws.items(), key=lambda kv:(-len(kv[1]), kv[0])):
        lawProfiles.append({
            'law':law,'count':len(rs),'ministries':sorted(set(r['ministry'] for r in rs if r['ministry'])),
            'targets':counts(rs,'lawLocalTargetType'),'characters':counts(rs,'taskCharacter'),'decreeGroups':counts(rs,'decreeGroup'),'phases':counts(rs,'implementationPhase'),
            'sampleTasks':[r['task'] for r in rs[:5]],
        })
    row_order=[x['name'] for x in counts(records,'lawLocalTargetType')]
    phase_order=['F1-형식상전환후보','F2-형식상신설검토후보','F3-직접권한·기위임','F5-형식연결보완','F4-법령명정규화']
    decree_order=[x['name'] for x in counts(records,'decreeGroup')]
    integ=[]
    for lt in row_order:
        for dg in decree_order:
            subset=[r for r in records if r['lawLocalTargetType']==lt and r['decreeGroup']==dg]
            if subset:
                row={'law_local_target_type':lt,'decree_group':dg,'row_total':str(len(subset)),'strategy_hint':'557개 기준 형식 분류 셀'}
                for ph in phase_order:
                    row[ph]=str(sum(1 for r in subset if r['implementationPhase']==ph))
                integ.append(row)
    top=[]
    for rank,row in enumerate(sorted(integ,key=lambda r:int(r['row_total']),reverse=True)[:8],1):
        top.append({'rank':str(rank),'law_local_target_type':row['law_local_target_type'],'decree_group':row['decree_group'],'task_character':'최종 F분류','count':row['row_total'],'submission_message':'557개 의견조회 대상 기준 최종 형식 분류 셀입니다.'})
    old=json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    legal_cache=json.loads(LEGAL_CACHE.read_text(encoding='utf-8')) if LEGAL_CACHE.exists() else {}
    legal={law:legal_cache.get(law, {'law':law,'lawDoc':None,'decreeDoc':None,'fetchStatus':'pending','error':''}) for law in laws}
    data={
        'meta':{'title':'법률-시행령 형식 기준 557개 의견조회 대상 F분류 탐색기','subtitle':'260512 3차 일괄이양 의견조회 대상(특행 포함) 557개 기준','generatedAt':'2026-05-13','source':str(XLSX.relative_to(WORK)),'baseClassification':'804 formal classification exact/law-article matched; unmatched fallback F2'},
        'summary':{'totalTasks':len(records),'totalLaws':len(laws),'matchCounts':dict(match_counts),'unmatchedCount':len(unmatched),'byLawLocalTargetType':counts(records,'lawLocalTargetType'),'byDecreeGroup':counts(records,'decreeGroup'),'byTaskCharacter':counts(records,'taskCharacter'),'byPolicyPackage':counts(records,'policyPackage'),'byImplementationPhase':counts(records,'implementationPhase'),'lawTextReady':sum(1 for v in legal.values() if v.get('lawDoc')),'decreeTextReady':sum(1 for v in legal.values() if v.get('decreeDoc'))},
        'matrices':{'lawTargetByDecree':matrix(records,'lawLocalTargetType','decreeGroup',row_order,decree_order),'lawTargetByCharacter':matrix(records,'lawLocalTargetType','implementationPhase',row_order,phase_order)},
        'lawProfiles':lawProfiles,'legalTexts':legal,'records':records,
        'integratedMatrices':{'targetDecreeByCharacter':integ,'targetCharacterByDecree':integ,'topCells':top,'summary':{'cellCount':len(integ),'generatedAt':'2026-05-13T18:55:00'}},
        'unmatched':unmatched,
    }
    OUT.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    (ROOT/'tmp').mkdir(exist_ok=True)
    (ROOT/'tmp/557-unmatched.json').write_text(json.dumps(unmatched,ensure_ascii=False,indent=2),encoding='utf-8')
    print('records',len(records),'laws',len(laws),'matches',match_counts,'unmatched',len(unmatched))

if __name__=='__main__': main()
