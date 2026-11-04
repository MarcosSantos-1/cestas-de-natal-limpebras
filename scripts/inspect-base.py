import sys, zipfile, json, xml.etree.ElementTree as ET
ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(sys.argv[1]) as z:
    shared=[]
    if 'xl/sharedStrings.xml' in z.namelist():
        for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',ns):
            shared.append(''.join(si.itertext()))
    for path in z.namelist():
        if not path.startswith('xl/worksheets/sheet') or not path.endswith('.xml'): continue
        root=ET.fromstring(z.read(path)); rows=root.findall('m:sheetData/m:row',ns)
        def values(row):
            result=[]
            for c in row.findall('m:c',ns):
                v=c.find('m:v',ns); text=v.text if v is not None else ''.join(c.itertext())
                if c.get('t')=='s': text=shared[int(text)]
                result.append((c.get('r'),text or ''))
            return result
        headers=[]; header_row=None
        for row in rows[:15]:
            vals=values(row)
            if any('cpf' in v.lower() for _,v in vals):
                headers=vals;header_row=row.get('r');break
        print(json.dumps({'sheet':path,'rows':len(rows),'header_row':header_row,'headers':headers,'formulas':len(root.findall('.//m:f',ns))},ensure_ascii=False))
