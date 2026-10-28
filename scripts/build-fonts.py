"""Build the bundled static OFL font instances (authoring only, fonttools==4.60.1)."""
import argparse
import hashlib
import json
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--source', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
a = p.parse_args()
a.output.mkdir(parents=True, exist_ok=True)
source_hash = hashlib.sha256(a.source.read_bytes()).hexdigest()
result = []
for weight, style in [(400, 'Regular'), (700, 'Bold')]:
    font = instantiateVariableFont(TTFont(a.source), {'wght': weight}, inplace=True)
    for platform, encoding, language in [(3, 1, 0x409), (1, 0, 0)]:
        for name_id, value in [(1, 'Luxixi Report Sans'), (2, style),
                               (4, 'Luxixi Report Sans ' + style),
                               (6, 'LuxixiReportSans-' + style),
                               (16, 'Luxixi Report Sans'), (17, style)]:
            font['name'].setName(value, name_id, platform, encoding, language)
    font['OS/2'].usWeightClass = weight
    dest = a.output / ('LuxixiReportSans-' + style + '.ttf')
    font.save(dest)
    result.append({'file': dest.name, 'weight': weight, 'source_sha256': source_hash,
                   'sha256': hashlib.sha256(dest.read_bytes()).hexdigest()})
    print(dest.name, dest.stat().st_size, flush=True)
(a.output / 'build-manifest.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
