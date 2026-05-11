#!/usr/bin/env python3
"""Embed law/decree article text into the final 804-task JSON bundle.

The current explorer already expects `legalTexts[law].lawDoc/decreeDoc` and per-record
`lawArticleKeys` / `decreeArticleKeys`. This script preserves the existing 804-task
classification data, fetches current law/decree article units from law.go.kr, and
fills those fields for static GitHub Pages use.
"""
from __future__ import annotations

import json
import pathlib
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

OC = "openclaw"
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "app/data/delegation.json"
CACHE = ROOT / "app/data/legal-text-cache.json"
ARTICLE_RE = re.compile(r"제\s*(\d+)\s*조(?:의\s*(\d+))?")


def norm(s: str | None) -> str:
    return re.sub(r"\s+", " ", (s or "").replace("\u3000", " ")).strip()


def get_xml(url: str, tries: int = 4) -> ET.Element:
    last: Exception | None = None
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            raw = urllib.request.urlopen(req, timeout=40).read()
            return ET.fromstring(raw)
        except Exception as e:  # noqa: BLE001 - keep fetch robust for batch job
            last = e
            time.sleep(0.7 * (attempt + 1))
    raise last or RuntimeError("unknown XML fetch error")


def law_search(query: str) -> list[dict[str, str]]:
    url = "http://www.law.go.kr/DRF/lawSearch.do?" + urllib.parse.urlencode(
        {"OC": OC, "target": "law", "type": "XML", "query": query, "display": "100"}
    )
    root = get_xml(url)
    return [{c.tag: c.text or "" for c in law} for law in root.findall("law")]


def law_xml(mst: str) -> ET.Element:
    url = "http://www.law.go.kr/DRF/lawService.do?" + urllib.parse.urlencode(
        {"OC": OC, "target": "law", "type": "XML", "MST": mst}
    )
    return get_xml(url)


def article_key(no: str | None, ui: str | None = "") -> str:
    no = str(no or "").strip().lstrip("0") or str(no or "").strip()
    ui = str(ui or "").strip().lstrip("0")
    return f"{no}의{ui}" if ui else no


def article_label(key: str) -> str:
    return f"제{key}조"


def parse_articles(root: ET.Element) -> list[dict]:
    articles: list[dict] = []
    for jo in root.findall(".//조문단위"):
        if (jo.findtext("조문여부") or "") != "조문":
            continue
        no = jo.findtext("조문번호") or ""
        ui_raw = jo.findtext("조문가지번호") or ""
        ui = "" if ui_raw in ("0", "00", "000") else ui_raw
        key = article_key(no, ui)
        if not key:
            continue
        title = norm(jo.findtext("조문제목") or "")
        body = norm(jo.findtext("조문내용") or "")
        paragraphs = []
        for hang in jo.findall(".//항"):
            pno = norm(hang.findtext("항번호") or "")
            pbody = norm(hang.findtext("항내용") or "")
            items = []
            for ho in hang.findall(".//호"):
                ino = norm(ho.findtext("호번호") or "")
                ibody = norm(ho.findtext("호내용") or "")
                if ino or ibody:
                    items.append({"number": ino, "text": ibody})
            if pno or pbody or items:
                paragraphs.append({"number": pno, "text": pbody, "items": items})
        text_parts = [body]
        for p in paragraphs:
            text_parts.append(f"{p['number']} {p['text']}")
            text_parts.extend(f"{i['number']} {i['text']}" for i in p["items"])
        articles.append(
            {
                "key": key,
                "label": article_label(key),
                "title": title,
                "body": body,
                "paragraphs": paragraphs,
                "text": norm(" ".join(text_parts)),
            }
        )
    return articles


def pick_law(hits: list[dict[str, str]], law: str) -> dict[str, str] | None:
    current = [h for h in hits if h.get("현행연혁코드") == "현행"] or hits
    exact_law = [h for h in current if h.get("법령명한글") == law and h.get("법령구분명") == "법률"]
    exact_any = [h for h in current if h.get("법령명한글") == law]
    return (exact_law or exact_any or current or [None])[0]


def pick_decree(hits: list[dict[str, str]], law: str) -> dict[str, str] | None:
    current = [h for h in hits if h.get("현행연혁코드") == "현행"] or hits
    names = [f"{law} 시행령"]
    if law.endswith("법"):
        names.append(law[:-1] + "법 시행령")
    no_space_targets = {n.replace(" ", "") for n in names}
    exact = [h for h in current if h.get("법령명한글") in names]
    compact = [h for h in current if (h.get("법령명한글") or "").replace(" ", "") in no_space_targets]
    contains = [h for h in current if "시행령" in (h.get("법령명한글") or "") and law.replace(" ", "") in (h.get("법령명한글") or "").replace(" ", "")]
    return (exact or compact or contains or [None])[0]


def make_doc(hit: dict[str, str] | None) -> dict | None:
    if not hit or not hit.get("법령일련번호"):
        return None
    return {
        "name": hit.get("법령명한글") or "",
        "mst": hit.get("법령일련번호") or "",
        "kind": hit.get("법령구분명") or "",
        "promulgationDate": hit.get("공포일자") or "",
        "enforcementDate": hit.get("시행일자") or "",
    }


def keys_from_text(*texts: str | None) -> list[str]:
    keys: list[str] = []
    for text in texts:
        for a, b in ARTICLE_RE.findall(text or ""):
            k = f"{int(a)}" + (f"의{int(b)}" if b else "")
            if k not in keys:
                keys.append(k)
    return keys


def enrich_doc(doc: dict | None) -> dict | None:
    if not doc or not doc.get("mst"):
        return doc
    root = law_xml(doc["mst"])
    articles = parse_articles(root)
    doc["articles"] = articles
    doc["articleCount"] = len(articles)
    doc["articlesByKey"] = {a["key"]: a for a in articles}
    return doc


def fetch_entry(law: str) -> dict:
    entry = {"law": law, "lawDoc": None, "decreeDoc": None, "fetchStatus": "ok", "error": ""}
    try:
        hits = law_search(law)
        law_doc = make_doc(pick_law(hits, law))
        decree_doc = make_doc(pick_decree(hits, law))
        entry["lawDoc"] = enrich_doc(law_doc)
        entry["decreeDoc"] = enrich_doc(decree_doc)
    except Exception as e:  # noqa: BLE001
        entry["fetchStatus"] = "error"
        entry["error"] = str(e)
    return entry


def main() -> None:
    data = json.loads(OUT.read_text(encoding="utf-8"))
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    records = data["records"]
    laws = sorted({r["law"] for r in records})

    legal = {}
    for i, law in enumerate(laws, 1):
        if law in cache and cache[law].get("fetchStatus") == "ok":
            entry = cache[law]
            print(f"cache {i}/{len(laws)} {law}", flush=True)
        else:
            print(f"fetch {i}/{len(laws)} {law}", flush=True)
            entry = fetch_entry(law)
            cache[law] = entry
            CACHE.write_text(json.dumps(cache, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
            time.sleep(0.12)
        legal[law] = entry

    for r in records:
        law_keys = keys_from_text(r.get("article"), r.get("lawEvidence"))
        decree_keys = keys_from_text(r.get("decreeEvidence"))
        r["lawArticleKeys"] = law_keys
        r["decreeArticleKeys"] = decree_keys

    summary = data.setdefault("summary", {})
    summary["lawTextReady"] = sum(1 for x in legal.values() if x.get("lawDoc") and x["lawDoc"].get("articleCount"))
    summary["decreeTextReady"] = sum(1 for x in legal.values() if x.get("decreeDoc") and x["decreeDoc"].get("articleCount"))
    summary["recordsWithLawArticleRefs"] = sum(1 for r in records if r.get("lawArticleKeys"))
    summary["recordsWithDecreeArticleRefs"] = sum(1 for r in records if r.get("decreeArticleKeys"))

    data["legalTexts"] = legal
    data.setdefault("meta", {})["legalTextSource"] = "법제처 국가법령정보 API(law.go.kr) 현행 법령 조문"
    data["meta"]["generatedAt"] = "2026-05-11"
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(
        "wrote",
        OUT,
        "records",
        len(records),
        "laws",
        len(legal),
        "lawTextReady",
        summary["lawTextReady"],
        "decreeTextReady",
        summary["decreeTextReady"],
        "lawRefs",
        summary["recordsWithLawArticleRefs"],
        "decreeRefs",
        summary["recordsWithDecreeArticleRefs"],
    )


if __name__ == "__main__":
    main()
