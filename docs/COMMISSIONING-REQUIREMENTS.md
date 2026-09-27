# Finnish commissioning documents: implementation boundary

Research checked **2026-09-26** against the primary sources linked below. This is a maintenance note for report design, not a determination that an individual installation complies. A generic commissioning record, a statutory installation certificate and an equipment service journal are different documents.

## Applicability and sources

| Document | Trigger and required content | PhaseKit boundary |
| --- | --- | --- |
| Installation certificate, **asennustodistus** | Environmental Protection Act 527/2014, **162 a §**, introduced by 754/2024 effective 2025-01-01: a business within 159 § must document installation of stationary refrigeration, air-conditioning and heat-pump equipment, identify the equipment and its verification measures, and deliver the responsible person's signed certificate to the holder. [Official amendment, 162 a §](https://www.finlex.fi/api/media/statute/690448/mainPdf/main.pdf?timestamp=2024-12-04T22%3A00%3A00.000Z). | A saved or finalised record is not automatically this certificate. Installation has a defined scope; do not assume merely placing any self-contained appliance is an installation operation. |
| National certificate contents | VNa **1063/2025, 1–2, 9 and 11 §§**, effective 2026-01-01, covers regulated F-gases/ODS and alternative refrigerants, including natural refrigerants. The minimum content is listed below. [Official decree, pages 1–4](https://www.finlex.fi/api/media/statute/893594/mainPdf/main.pdf?timestamp=2025-12-02T08%3A13%3A03.151Z). | Separate working records and certificate preparation. Do not infer declarations, qualifications, test adequacy or signatures from completed checkboxes. |
| F-gas equipment records | Regulation **(EU) 2024/573, Articles 5 and 7**: equipment subject to Article 5(1) leak checks needs individual records. Starting thresholds are 5 t CO₂e for Annex I gases or 1 kg for Annex II section 1 gases; equipment categories and hermetically sealed exemptions still apply. Records include refrigerant types/quantities installed, added (with dates), recovered, recycled/reclaimed provenance, undertaking/person identities and applicable certificate numbers, check/repair dates/results, and decommissioning recovery/disposal actions. Operator and undertaking keep records/copies at least five years, subject to the competent-authority database provision. [EUR-Lex, Articles 5 and 7](https://eur-lex.europa.eu/legal-content/EN-FR/TXT/?uri=CELEX%3A32024R0573). | A single commissioning PDF is not the complete ongoing journal. Preserve subsequent dated interventions and exports. Browser storage alone does not establish five-year retention. |
| Other national service journals | VNa **1063/2025, 10 §** also requires journals for non-consumer/non-household refrigeration, AC and heat-pump equipment containing at least **500 g of alternative refrigerant**. Retention is at least five years. The journal identifies refrigerant movements/provenance, dated actions/results, business/person licence details and decommissioning measures. [Decree, page 4](https://www.finlex.fi/api/media/statute/893594/mainPdf/main.pdf?timestamp=2025-12-02T08%3A13%3A03.151Z). | Do not gate all journal functionality solely on F-gas CO₂e thresholds. |
| Electrical commissioning inspection | **Sähköturvallisuuslaki 1135/2016, 43 §; VNa 1434/2016, 4–5 §§.** Electrical installations are inspected before use. Written reports identify the object/work, constructor and electrical works manager with contacts, compliance, standards and any applicable deviation statement, inspection methods, results and inspector verification. Minor works have written-report exemptions; inspection itself is still needed. [Tukes guidance](https://tukes.fi/sahko/sahkoasennusten-kayttoonottovaiheen-tarkastukset), [official decree](https://www.finlex.fi/api/media/statute/64523/mainPdf/main.pdf). | Treat as a separate report or identified attachment. Refrigerant pressure/temperature measurements do not replace electrical inspection results. |
| Pressure equipment documentation | Registration and first periodic inspection depend on equipment classification and thresholds in **VNa 1549/2016, 6 §**. Registration requires technical/location/holder and operating-supervisor details and an approved inspection body's involvement. [Tukes registration guidance](https://tukes.fi/tuotteet-ja-palvelut/painelaitteet/painelaitteen-kaytto/painelaitteen-rekisterointi). Design/manufacture/conformity requirements are a separate assessment; the pressure-equipment scope is not a universal refrigerant charge threshold. | Ask whether a pressure-test report is required and identify the actual report. Do not implement a legal applicability engine from LP/HP readings. A pressure test, a tightness test and a registered equipment inspection are distinct. |
| Technical commissioning measurements | EN 378-2 addresses design, construction, installation, testing, commissioning, marking and documentation. [Official SIS scope](https://www.sis.se/en/produkter/standardization/vocabularies/energy-and-heat-transfer-engineering-vocabularies/ss-en-378-22016/). Full normative clauses were not available in this review. | Record the applicable manufacturer instruction/version and acceptance criteria. LP/HP, suction/discharge/liquid temperatures, SH/SC and log(p)–h are useful evidence; this research does not establish them as an identical statutory field set for every installation. |

## Certificate minimum checklist

The eleven items in **1063/2025, 9 §** are:

1. Installation location.
2. Serial number or other equipment identification.
3. Refrigerant, safety class, GWP and charge.
4. Statutory leak-check interval.
5. Pressure-test report when pressure-equipment law requires that test.
6. Evacuation report.
7. Tightness-test report.
8. Test-run report.
9. Installer **and** business responsible person's names and licence numbers.
10. Business declaration of equipment compliance with the F-gas Regulation.
11. Responsible person's signature attesting test sufficiency and correctness.

This minimum does not specify a universal vacuum target or holding duration. The decree's scope and detail above are sourced from the [official text, 9 §](https://www.finlex.fi/api/media/statute/893594/mainPdf/main.pdf?timestamp=2025-12-02T08%3A13%3A03.151Z).

## Implementation decisions and maintenance

- **Annexes:** a reference field identifies an actual retained test report; a reference or checked box alone does not supply missing test content. Export must make the attachment relationship clear. Do not label reference-only output a complete installation certificate.
- **Signatures:** installer/technician identity and responsible-person signature are different roles. A typed name or blank print-signature line must not be presented as an already verified signature. User confirmation must be explicit and initially unset.
- **GWP:** preserve the entered value and its source/basis. A catalogue property value is not automatically the applicable regulatory GWP. Leak-check calculations must retain their legal basis, data/rule version, date, equipment assumptions and exemptions. Never silently replace historical GWP with refreshed data.
- **Date and handover:** use separate work date, technician, responsible person, signature date and recipient/handover metadata where needed. Work/signature/handover dates serve different purposes; app generation time is not the work date. Recipient/date are useful delivery evidence, not additional items claimed to appear in the eleven-item list.
- **Measurements:** keep achieved evacuation pressure, evacuation duration, hold-start pressure, hold-end pressure and hold duration separate. Do not equate achieved pressure with hold-start pressure, or infer pass/fail without the applicable criterion.
- **State:** finalising freezes the record; it does not certify legal completeness or equipment safety. Missing requirements remain visible in exported records. Preserve legacy free text and external-document references without inventing replacements.
- **Recheck:** before changing certificate requirements, review the [current Finlex entry](https://www.finlex.fi/fi/lainsaadanto/2025/1063), its amendments/corrections, 527/2014 §§159–163, and EUR-Lex Articles 5/7. A targeted search found no later amendment to 1063/2025 §9 on the research date. Finlex's consolidated HTML did not expose the full text to the research tool, so this note relies on the verified original official PDF rather than claiming an exhaustive amendment-history audit.

No universal pressure-equipment applicability decision, signature-authentication mechanism, or full EN 378 compliance assessment was verified in this bounded review.
