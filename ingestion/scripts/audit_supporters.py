#!/usr/bin/env python3
"""Quick supporter-signal audit for one city's published venues.jsonl."""
import json
import sys

path = sys.argv[1]
venues = [json.loads(l) for l in open(path) if l.strip()]
total = len(venues)
team = [v for v in venues if v.get("supportsTeams")]
high = [v for v in venues if (v.get("showsMatches") or 0) >= 0.8]
seeded = [v for v in venues if any(s.get("name") == "supporters-seed" for s in v.get("sources", []))]

print(f"total venues            : {total}")
print(f"with team affiliation   : {len(team)}")
print(f"showsMatches >= 0.8     : {len(high)}")
print(f"supporter-seed sourced  : {len(seeded)}")
print("\n-- venues with team affiliation --")
for v in sorted(team, key=lambda v: v["name"]):
    src = "+seed" if any(s.get("name") == "supporters-seed" for s in v.get("sources", [])) else "osm"
    print(f"  {v['name'][:40]:40} {v['kind']:10} teams={v['supportsTeams']} shows={v['showsMatches']} [{src}]")
