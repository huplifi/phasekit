"""Reviewed, source-row-attributed property and mass-composition overlay.

Run this file to regenerate property-composition-supplement.json. Each compact
recipe below is a direct mass-% transcription from the named primary table.
The importer checks component identity and exact 100% totals before use.
"""
import csv
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
UNEP = "unep-ozone-oewg47-inf3-rev1"

sources = [
    {"id": UNEP, "title": "Mixtures of controlled substances: tables 1 and 2", "publisher": "UNEP Ozone Secretariat", "url": "https://ozone.unep.org/system/files/documents/OEWG-47-INF-3-Rev-1.pdf", "version": "UNEP/OzL.Pro.WG.1/47/INF/3/Rev.1, tables 1 and 2", "license": "Official public UN document; attributed factual composition extracts", "scope": "Nominal blend composition by mass only; Montreal Protocol GWP and default ODP not reused as EU facts.", "note": "The document explicitly says unassigned ODP/GWP values default to zero; blank ODP cells must not be interpreted as zero."},
    {"id": "chemours-xp30-tech", "title": "Opteon XP30 (R-514A) product information", "publisher": "Chemours", "url": "https://pages.chemours.com/rs/509-VCL-038/images/opteonXP30-pt-BoletimTecnico.pdf", "version": "2016 product bulletin, physical properties table", "license": "Selected factual product properties with attribution", "scope": "R-514A mass composition and physical properties; no retrofit approval inferred."},
    {"id": "honeywell-r515b-tds", "title": "Solstice N15 (R-515B) technical data sheet", "publisher": "Honeywell", "url": "https://prod-edam.honeywell.com/content/dam/honeywell-edam/pmt/oneam/en-us/refrigerants/documents/pmt-am-515b-tds.pdf", "version": "Technical data sheet reviewed 2026-09-25", "license": "Selected factual product properties and contextual lubricant guidance with attribution", "scope": "R-515B composition, safety, ODP, normal boiling point and oil note; no universal compressor compatibility."},
    {"id": "epa-r480a-snap39", "title": "SNAP Notice 39 R-480A assessment", "publisher": "United States Environmental Protection Agency", "url": "https://www.epa.gov/system/files/documents/2024-12/12145-01-oar-snap-39_webversion.pdf", "version": "2024-11-27 prepublication, R-480A section", "license": "US EPA data are public domain by default unless otherwise specified", "scope": "R-480A mass composition only; US use decisions not applied in EU."},
    {"id": "epa-r516a-snap27", "title": "SNAP proposed rule 27 R-516A assessment", "publisher": "United States Environmental Protection Agency", "url": "https://www.epa.gov/system/files/documents/2025-10/frl-12207-1-oar-snap-27-nprm-preamble-10222025_admin-prepub_0.pdf", "version": "2025-10-24 prepublication, R-516A section", "license": "US EPA data are public domain by default unless otherwise specified", "scope": "R-516A mass composition and A2L classification only; proposal status retained."},
    {"id": "epa-chiller-snap-r514a", "title": "Substitutes in Centrifugal Chillers", "publisher": "United States Environmental Protection Agency", "url": "https://www.epa.gov/snap/substitutes-centrifugal-chillers", "version": "Page reviewed 2026-09-25", "license": "US EPA data are public domain by default unless otherwise specified", "scope": "R-514A listed safety class B1 and published ODP; US use status not EU legality."},
    {"id": "ul-flammable-whitepaper", "title": "Revisiting Flammable Refrigerants", "publisher": "UL", "url": "https://www.epa.gov/sites/default/files/documents/ul_whitepaper_flammablerefrigerants.pdf", "version": "UL white paper, table 5, page 14", "license": "Selected factual temperatures and limits with attribution", "scope": "R-290, R-600 and R-600a ignition temperature and lower flammability limit only."},
    {"id": "chemours-replacement-guide", "title": "Opteon/Freon general replacement guide", "publisher": "Chemours", "url": "https://www.chemours.com/en/-/media/files/freon/opteon-freon-general-replacement-guide.pdf", "version": "2022-12-15 replacement guide; selected lubricant column", "license": "Short contextual oil guidance with attribution", "scope": "Manufacturer-specific POE note for listed Opteon products; equipment manufacturer approval remains necessary."},
    {"id": "bitzer-refreport-table", "title": "BITZER Refrigerant Report online selection table", "publisher": "BITZER", "url": "https://www.bitzer.de/shared_media/html/a-500-501/en-GB/679592331679628043.html", "version": "Online table reviewed 2026-09-25", "license": "Selected factual property extracts and contextual manufacturer oil categories with attribution", "scope": "ODP, ISO 817 safety class, molar mass, atmospheric boiling/bubble temperature, atmospheric glide, and BITZER oil categories. GWP and legal status excluded.", "note": "Normal boiling for blends is the bubble point at ambient pressure. BITZER's -78.3°C R744 line is sublimation and is not imported as normal boiling. Oil 1 is typical for BITZER, Oil 2/3 possible; equipment-specific approval is still required."},
    {"id": "coolprop-pt-7.2.0", "title": "CoolProp 7.2.0 HEOS saturation and predefined mixtures", "publisher": "CoolProp project", "url": "https://github.com/CoolProp/CoolProp/tree/v7.2.0", "version": "CoolProp 7.2.0; git revision 98b3523d5daa98454618d381d2ae53f7471d216b", "license": "MIT License", "scope": "Source for offline generated saturation curves and predefined mixture equations; distinct from the pinned identity import.", "note": "Generated PT metadata must identify this separate runtime and its validity range."},
    {"id": "daikin-r32-sds-2023", "title": "HFC-32 safety data sheet", "publisher": "Daikin", "url": "https://www.daikinchemicals.com/library/pb_common/pdf/sds/Refrigerants/sds-HFC-32-E_20230323.pdf", "version": "Revision 2023-03-23, section 9, page 4", "license": "Selected factual safety-property extract with attribution", "scope": "R32 lower explosive limit in air. The cited Japanese method does not state test temperature; the same sheet says auto-ignition temperature not determined.", "note": "Do not substitute the separate 'ignition temperature' line for the explicitly undetermined auto-ignition field."},
    {"id": "chemours-yf-bulletin", "title": "Opteon YF automotive refrigerant product information", "publisher": "Chemours", "url": "https://www.chemours.com/en/-/media/files/opteon/opteon-yf-product-information-bulletin.pdf", "version": "Product bulletin, table 2, reviewed 2026-09-25", "license": "Selected factual flammability-property extract with attribution", "scope": "R1234yf LFL at 21°C by ASTM E681-04 and autoignition by EC test A15."},
    {"id": "chemours-a2l-charge-guidance", "title": "Safety considerations and charge size guidance when using low GWP A2L HFO blends", "publisher": "Chemours", "url": "https://www.chemours.com/en/-/media/files/opteon/case-studies/opteon-a2l-wp-charge-size-guidance-102919-final.pdf", "version": "2019 technical white paper, table 2, page 7", "license": "Selected factual comparison-table extract with attribution", "scope": "R152a lower flammability limit in air; test temperature is not specified in the table."},
]

# UNEP table entries transcribed only when the source gives explicit nominal
# component percentages. Each is id component-id=mass-percent ...
unep_recipes = """
r403a r22=75 r218=20 r290=5
r407e r32=25 r125=15 r134a=60
r407g r32=2.5 r125=2.5 r134a=95
r407h r32=32.5 r125=15 r134a=52.5
r407i r32=19.5 r125=8.5 r134a=72
r409b r22=65 r124=25 r142b=10
r412a r22=70 r142b=25 r218=5
r413a r134a=88 r218=9 r600a=3
r415a r22=82 r152a=18
r415b r22=25 r152a=75
r416a r124=39.5 r134a=59 r600=1.5
r417b r125=79 r134a=18.3 r600=2.7
r417c r125=19.5 r134a=78.8 r600=1.7
r418a r22=96 r152a=2.5 r290=1.5
r419a r125=77 r134a=19 re170=4
r419b r125=48.5 r134a=48 re170=3.5
r422e r125=58 r134a=39.3 r600a=2.7
r423a r134a=52.5 r227ea=47.5
r425a r32=18.5 r134a=69.5 r227ea=12
r427c r32=25 r125=25 r134a=40 r143a=10
r429a r152a=10 re170=60 r600a=30
r430a r152a=76 r600a=24
r431a r152a=29 r290=71
r432a r1270=80 re170=20
r433a r1270=30 r290=70
r433b r1270=5 r290=95
r433c r1270=25 r290=75
r435a r152a=20 re170=80
r436a r290=56 r600a=44
r436b r290=52 r600a=48
r436c r290=95 r600a=5
r437a r125=19.5 r134a=78.5 r600=1.4 r601=0.6
r439a r32=50 r125=47 r600a=3
r440a r134a=1.6 r152a=97.8 r290=0.6
r443a r1270=55 r290=40 r600a=5
r444a r32=12 r152a=5 r1234zee=83
r444b r32=41.5 r152a=10 r1234zee=48.5
r445a r134a=9 r1234zee=85 r744=6
r446a r32=68 r1234zee=29 r600=3
r447a r32=68 r125=3.5 r1234zee=28.5
r447b r32=68 r125=8 r1234zee=24
r448b r32=21 r125=21 r134a=31 r1234yf=20 r1234zee=7
r449b r32=25.2 r125=24.3 r134a=27.3 r1234yf=23.2
r449c r32=20 r125=20 r134a=29 r1234yf=31
r451a r134a=10.2 r1234yf=89.8
r451b r134a=11.2 r1234yf=88.8
r452a r32=11 r125=59 r1234yf=30
r452b r32=67 r125=7 r1234yf=26
r452c r32=12.5 r125=61 r1234yf=26.5
r453a r32=20 r125=20 r134a=53.8 r227ea=5 r600=0.6 r601a=0.6
r454a r32=35 r1234yf=65
r454b r32=68.9 r1234yf=31.1
r454c r32=21.5 r1234yf=78.5
r455a r32=21.5 r1234yf=75.5 r744=3
r456a r32=6 r134a=45 r1234zee=49
r457a r32=18 r152a=12 r1234yf=70
r457b r32=35 r152a=10 r1234yf=55
r457c r32=7.5 r152a=14.5 r1234yf=78
r458a r32=20.5 r125=4 r134a=61.4 r227ea=13.5 r236fa=0.6
r459a r32=68 r1234yf=26 r1234zee=6
r459b r32=21 r1234yf=69 r1234zee=10
r460a r32=12 r125=52 r134a=14 r1234zee=22
r460b r32=28 r125=25 r134a=20 r1234zee=27
r460c r32=2.5 r125=2.5 r134a=46 r1234zee=49
r461a r125=55 r134a=32 r143a=5 r227ea=5 r600a=3
r462a r32=9 r125=42 r134a=44 r143a=2 r600=3
r463a r32=36 r125=30 r134a=14 r1234yf=14 r744=6
r464a r32=27 r125=27 r227ea=6 r1234zee=40
r465a r32=21 r1234yf=71.1 r290=7.9
r467a r32=22 r125=5 r134a=72.4 r600a=0.6
r468a r32=21.5 r1132a=3.5 r1234yf=75
r468b r32=13 r1132a=6 r1234yf=81
r468c r32=42 r1132a=6 r1234yf=52
r469a r32=32.5 r125=32.5 r744=35
r470a r32=17 r125=19 r134a=7 r227ea=3 r1234zee=44 r744=10
r470b r32=11.5 r125=11.5 r134a=3 r227ea=7 r1234zee=57 r744=10
r471a r227ea=4.3 r1336mzze=17 r1234zee=78.7
r472a r32=12 r134a=19 r744=69
r472b r32=10 r134a=32 r744=58
r473a r125=10 r23=10 r1132a=20 r744=60
r474a r1132e=23 r1234yf=77
r475a r134a=43 r1234yf=45 r1234zee=12
r476a r134a=10 r1336mzze=12 r1234zee=78
r482a r134a=10 r1224ydz=6.5 r1234zee=83.5
r500 r12=73.8 r152a=26.2
r501 r12=25 r22=75
r502 r115=51.2 r22=48.8
r503 r13=59.9 r23=40.1
r504 r115=51.8 r32=48.2
r509a r22=44 r218=56
r510a re170=88 r600a=12
r511a re170=5 r290=95
r512a r134a=5 r152a=95
r513b r134a=41.5 r1234yf=58.5
"""

compositions = []
for line in unep_recipes.splitlines():
    if not line.strip():
        continue
    rid, *parts = line.split()
    compositions.append({"id": rid, "sourceId": UNEP, "massPercent": {k: float(v) for k, v in (part.split("=") for part in parts)}})
compositions += [
    {"id": "r480a", "sourceId": "epa-r480a-snap39", "massPercent": {"r744": 5, "r1234zee": 86, "r227ea": 9}},
    {"id": "r514a", "sourceId": "chemours-xp30-tech", "massPercent": {"r1336mzzz": 74.7, "r1130e": 25.3}},
    {"id": "r515b", "sourceId": "honeywell-r515b-tds", "massPercent": {"r1234zee": 91.1, "r227ea": 8.9}},
    {"id": "r516a", "sourceId": "epa-r516a-snap27", "massPercent": {"r1234yf": 77.5, "r152a": 14, "r134a": 8.5}},
]

def fact(value, source):
    return {"value": str(value), "sourceId": source}

properties = [
    {"id": "r514a", "facts": {"ashrae_safety_group": fact("B1", "epa-chiller-snap-r514a"), "odp": fact("0.00006", "epa-chiller-snap-r514a"), "normal_boiling_c": fact("29.1", "chemours-xp30-tech"), "critical_pressure_bar_abs": fact("35.2", "chemours-xp30-tech"), "molar_mass_g_mol": fact("139.6", "chemours-xp30-tech")}},
    {"id": "r515b", "facts": {"ashrae_safety_group": fact("A1", "honeywell-r515b-tds"), "odp": fact("0", "honeywell-r515b-tds"), "normal_boiling_c": fact("-18.9", "honeywell-r515b-tds"), "lower_flammability_limit_vol_pct": fact("not_applicable", "honeywell-r515b-tds"), "oil_typical": fact("POE", "honeywell-r515b-tds"), "oil_notes_fi": fact("Honeywell suosittelee Solstice N15:lle (R515B) POE-öljyä. Tarkista käytettävä öljy ja viskositeetti laitteen tai kompressorin valmistajalta.", "honeywell-r515b-tds"), "oil_notes_en": fact("Honeywell recommends POE oil for Solstice N15 (R515B). Confirm the specific lubricant and viscosity with the equipment or compressor manufacturer.", "honeywell-r515b-tds")}},
    {"id": "r516a", "facts": {"ashrae_safety_group": fact("A2L", "epa-r516a-snap27")}},
]
for rid, temp, lfl in [("r290", 470, 2.1), ("r600", 365, 1.5), ("r600a", 460, 1.8)]:
    properties.append({"id": rid, "facts": {"autoignition_c": fact(temp, "ul-flammable-whitepaper"), "lower_flammability_limit_vol_pct": fact(lfl, "ul-flammable-whitepaper")}})
properties += [
    {"id": "r32", "facts": {"lower_flammability_limit_vol_pct": {**fact("13.8", "daikin-r32-sds-2023"), "conditions": {"phase": "gas_in_air", "method": "Daikin SDS section 9: lower explosive limit, Japanese High Pressure Gas Safety Act; test temperature not stated"}}}},
    {"id": "r1234yf", "facts": {"lower_flammability_limit_vol_pct": {**fact("6.2", "chemours-yf-bulletin"), "conditions": {"temperatureC": 21, "phase": "gas_in_air", "method": "ASTM E681-04"}}, "autoignition_c": {**fact("405", "chemours-yf-bulletin"), "conditions": {"phase": "gas_in_air", "method": "EC Physico/Chemical Test A15; measured by Chilworth Technology"}}}},
    {"id": "r152a", "facts": {"lower_flammability_limit_vol_pct": {**fact("3.9", "chemours-a2l-charge-guidance"), "conditions": {"phase": "gas_in_air", "method": "Chemours comparison table 2; test temperature not stated"}}}},
]
for rid in ("r449a", "r452a", "r513a"):
    properties.append({"id": rid, "facts": {"oil_typical": fact("POE", "chemours-replacement-guide"), "oil_notes_fi": fact("Chemoursin tuotekohtainen ohje ilmoittaa POE-öljyn. Varmista öljyn soveltuvuus ja viskositeetti laitteen tai kompressorin valmistajalta.", "chemours-replacement-guide"), "oil_notes_en": fact("Chemours' product guide lists POE oil. Confirm lubricant suitability and viscosity with the equipment or compressor manufacturer.", "chemours-replacement-guide")}})

# Selected columns from the BITZER online table, reviewed against the live
# source on 2026-09-25. Format: designation|ODP|ISO817|molar g/mol|normal
# boiling/bubble °C|normal glide K|oil 1;oil 2;oil 3. No GWP values are copied:
# BITZER's AR4/5/6 columns are not the app's EU legal basis.
bitzer_rows = """
R11|1|A1|137,37|23,8|0|MO;AB
R12|1|A1|120,91|-29,8|0|MO;AB
R13|1|A1|104,46|-81,4|0|MO;AB
R13B1|10|A1|148,92|-57,7|0|MO;AB
R13I1|0,01|A1|195,91|-21,9|0|POE
R14|0|A1|88,01|-127,9|0|POE
R22|0,055|A1|86,47|-40,7|0|MO;AB
R23|0|A1|70,01|-82|0|POE;PVE
R32|0|A2L|52,02|-51,7|0|POE;PVE
R40|0,02|B2|50,48|-23,8|0|MO
R113|0,8|A1|187,38|47,6|0|MO;AB
R114|1|A1|170,93|3,6|0|MO;AB
R115|0,44|A1|154,47|-39,2|0|MO;AB
R116|0|A1|138,01|-78,1|0|POE
R123|0,02|B1|152,92|27,8|0|MO;AB
R124|0,022|A1|136,47|-12|0|MO;AB
R125|0|A1|120,02|-48,5|0|POE;PVE
R134a|0|A1|102,03|-26,1|0|POE;PVE
R141b|0,11||116,95|32|0|MO;AB
R142b|0,065|A2|100,5|-9,1|0|MO;AB
R143a|0|A2L|84,04|-47,2|0|POE;PVE
R152a|0|A2|66,05|-24|0|POE;PVE
R170|0|A3|30,07|-88,6|0|PAO;MO;POE
R218|0|A1|188,02|-36,8|0|POE
R227ea|0|A1|170,03|-16,3|0|POE;PVE
R236fa|0|A1|152,04|-1,5|0|POE;PVE
R245fa|0|B1|134,05|15,1|0|POE
R290|0|A3|44,1|-42,1|0|PAO;PAG;POE
R600|0|A3|58,12|-0,5|0|MO;PAO;POE
R600a|0|A3|58,12|-11,8|0|MO;PAO;POE
R717|0|B2L|17,03|-33,4|0|MO;PAO;MO/HC
R718|0|A1|18,02|100|0|
R723|0|B2|22,77|-36,5|0|MO;PAO;MO/HC
R744|0|A1|44,01||0|POE;PAG
R744A|0,017|A1|44,01|-88,5|0|special
R1130(E)|0,0002|B2|96,94|48|0|
R1132a|0|A2|64,03|-84|0|POE
R1132(E)|0|B2|64,03|-52,5|0|POE
R1150|0|A3|28,05|-103,8|0|MO;PAO
R1224yd(Z)|0,00012|A1||14,6|0|POE
R1233zd(E)|0,00034|A1|133,5|18,3|0|POE
R1234yf|0|A2L|114,04|-29,5|0|POE;PVE
R1234ze(E)|0|A2L|114,04|-19|0|POE;PVE
R1270|0|A3|42,08|-47,6|0|PAO;PAG;POE
R1336mzz(E)|0|A1|164,06|7,6|0|POE;special
R1336mzz(Z)|0|A1|164,06|33,5|0|POE;special
R401A|0,04|A1|94,44|-32,9|5,7|MO;AB
R401B|0,04|A1|92,84|-34,6|5,6|MO;AB
R402A|0,02|A1|101,55|-48,9|1,9|AB
R402B|0,03|A1|94,71|-47|2,2|AB
R403A|0,04|A1|91,98|-47,4|3,1|AB
R403B|0,03|A1|103,26|-48,6|1,8|AB
R404A|0|A1|97,6|-46,2|0,7|POE;PVE
R407A|0|A1|90,11|-45,2|6,5|POE;PVE
R407B|0|A1|102,94|-46,5|4,2|POE
R407C|0|A1|86,2|-43,8|7,1|POE;PVE
R407F|0|A1|82,06|-46,1|6,4|POE;PVE
R407H|0|A1|79,1|-44,6|7|POE;PVE
R408A|0,03|A1|87,01|-44,6|0,5|AB
R409A|0,05|A1|97,43|-34,5|8,5|MO;AB
R409B|0,05|A1|96,67|-35,6|7,7|MO;AB
R410A|0|A1|72,59|-51,4|0|POE;PVE
R411A|0,05|A2|82,36|-39,5|2,9|MO;AB
R411B|0,05|A2|83,07|-41,6|1,6|MO;AB
R413A|0|A1|103,95|-33,4|5,3|AB;POE
R417A|0|A1|106,75|-39,1|5|POE;PVE
R417B|0|A1|113,12|-44,9|3,4|POE;PVE
R418A|0,033|A2|84,59|-41,7|1,7|MO;AB
R419A|0|A2|109,34|-42,6|6,7|POE
R420A|0,005|A1|101,85|-25|0,8|POE
R421A|0|A1|111,75|-40,7|5,3|POE
R421B|0|A1|116,93|-45,6|3,2|POE
R422A|0|A1|113,6|-46,5|2,5|POE;PVE
R422B|0|A1|108,52|-41,3|5,4|POE
R422C|0|A1|113,4|-45,9|3|POE
R422D|0|A1|109,94|-43,2|4,9|POE;PVE
R427A|0|A1|90,44|-43|6,8|POE;PVE
R434A|0|A1|105,74|-45|2,7|POE
R437A|0|A1|103,71|-32,4|3,5|POE;PVE
R438A|0|A1|99,13|-42,3|6,6|POE;PVE
R442A|0|A1|81,76|-46,4|6,7|POE;PVE
R443A|0|A3|43,47|-45,2|3,1|PAO;POE;MO
R444A|0|A2L|96,7|-35,7|11,1|POE;PVE
R444B|0|A2L|72,76|-45|10|POE;PVE
R447B|0|A2L||-50|4|POE;PVE
R448A|0|A1|86,28|-46,1|6,2|POE;PVE
R449A|0|A1|87,21|-45,7|5,7|POE;PVE
R449B|0|A1||-46|6|POE;PVE
R449C|0|A1||-44|6|POE;PVE
R450A|0|A1|108,67|-23,4|0,6|POE;PVE
R452A|0|A1|103,51|-46,9|3,8|POE;PVE
R452B|0|A2L|63,53|-50,7|0,9|POE;PVE
R452C|0|A1|101,95|-47,5|3,4|POE;PVE
R454A|0|A2L|79,79|-47,9|5,7|POE;PVE
R454B|0|A2L|62,61|-50,5|1|POE;PVE
R454C|0|A2L|90,78|-45,6|7,8|POE;PVE
R455A|0|A2L|87,45|-52|12,8|POE;PVE
R456A|0|A1|101,42|-30,8|5,4|POE;PVE
R457A|0|A2L|87,61|-42,6|7,1|POE;PVE
R457B|0|A2L|76,5|-46,4|6|POE;PVE
R457C|0|A2L|95,4|-37,3|5,2|POE;PVE
R459A|0|A2L|62,98|-50,3|1,8|POE;PVE
R459B|0|A2L|91,21|-45|8,3|POE;PVE
R460A|0|A1|100,6|-44,6|8|POE;PVE
R460B|0|A1|84,8|-45,6|8,7|POE;PVE
R463A|0|A1|74,72|-59,9|13|POE;PVE
R465A|0|A2|82,9|-51,7|11,7|POE;PVE
R466A|0|A1|80,69|-51,7|0,7|POE;PVE
R468A|0|A2L|88,8|-51,2|12,2|POE
R468B|0|A2L|94,9|-52,4|15,6|POE
R468C|0|A2L|73,7|-56,6|10,4|POE
R469A|0|A1|59,1|-78,5|17|POE
R471A|0|A1|122,09|-16,9|3,2|POE
R472A|0|A1|50,39|-84,3|22,8|POE
R472B|0|A1|54,8|-82,9|28,1|POE
R473A|0|A1|52,58|-75,8|3,7|POE
R474A|0|A2L|96,7|-43,1|6,7|POE
R475A|0|A1|108,54|-28,8|0,5|POE
R476A|0|A1|116,9|-19,1|3|POE
R500|0,74|A1|99,3|-33,6|0|MO;AB
R502|0,33|A1|111,64|-45,4|0|AB
R503|0,6|A1|87,24|-87,9|0|AB
R507A|0|A1|98,86|-46,7|0|POE;PVE
R508A|0|A1|100,1|-87,6|0|POE
R508B|0|A1|95,39|-87,6|0|POE
R511A|0|A3|44,19|-42|0|PAO;POE;MO
R513A|0|A1|108,31|-29,6|0,1|POE;PVE
R513B|0|A1|108,73|-29,6|0|POE;PVE
R514A|0|B1|139,6|28,8|0|POE
R515B|0|A1|117,48|-18,8|0|POE
R516A|0|A2L|102,58|-29,4|0|POE
"""

known = {row["id"]: row for row in csv.DictReader((HERE.parent / "refrigerants.csv").open(encoding="utf-8"))}
for line in bitzer_rows.splitlines():
    if not line.strip():
        continue
    designation, odp, safety, molar, boiling, glide, oils = line.split("|")
    rid = re.sub(r"[^a-z0-9]", "", designation.lower())
    if rid not in known:
        continue
    facts = {}
    if odp:
        facts["odp"] = fact(odp.replace(",", "."), "bitzer-refreport-table")
    if safety:
        facts["ashrae_safety_group"] = fact(safety, "bitzer-refreport-table")
    if molar:
        facts["molar_mass_g_mol"] = fact(molar.replace(",", "."), "bitzer-refreport-table")
    if boiling:
        facts["normal_boiling_c"] = {**fact(boiling.replace(",", "."), "bitzer-refreport-table"), "conditions": {"temperatureC": float(boiling.replace(",", ".")), "pressureKPaAbsolute": 101.325, "phase": "bubble" if known[rid]["kind"] == "blend" else "saturation", "method": "BITZER normal boiling/bubble point at ambient pressure"}}
    if known[rid]["kind"] == "blend" and glide:
        facts["nominal_glide_k"] = {**fact(glide.replace(",", "."), "bitzer-refreport-table"), "conditions": {"temperatureC": float(boiling.replace(",", ".")), "pressureKPaAbsolute": 101.325, "phase": "two_phase", "method": "BITZER normal dew minus bubble point at ambient pressure"}}
    if oils and "special" not in oils and "MO/HC" not in oils:
        names = {"POE": "POE", "PVE": "PVE", "MO": "mineraaliöljy (MO)", "AB": "alkyylibentseeni (AB)", "PAO": "PAO", "PAG": "PAG"}
        types = oils.split(";")
        facts["oil_typical"] = fact(types[0], "bitzer-refreport-table")
        if len(types) > 1:
            facts["oil_possible"] = fact(";".join(types[1:]), "bitzer-refreport-table")
        facts["oil_notes_fi"] = fact(f"BITZERin taulukossa tavallinen öljy on {names[types[0]]}; muut mahdolliset: {', '.join(names[t] for t in types[1:]) if len(types) > 1 else 'ei ilmoitettu'}. Tarkista sopiva öljy ja viskositeetti kompressorimallin valmistajalta.", "bitzer-refreport-table")
        facts["oil_notes_en"] = fact(f"BITZER lists {types[0]} as typical oil{'; other possible types: ' + ', '.join(types[1:]) if len(types) > 1 else ''}. Confirm the oil and viscosity for the specific compressor model with its manufacturer.", "bitzer-refreport-table")
    properties.append({"id": rid, "policy": "bitzer", "facts": facts})

output = {"reviewedAt": "2026-09-25", "sources": sources, "compositions": compositions, "properties": properties}
(HERE / "property-composition-supplement.json").write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"Wrote {len(compositions)} blend compositions and {len(properties)} property entries")
