# Release gates

PhaseKit is a working web app, not a certified refrigeration instrument. Completion evidence is recorded in VERIFICATION.md. Hosting history and the GitHub/Netlify transition are recorded in DEPLOYMENT.md. Public web availability does not satisfy the review and device-validation gates below. No app-store publication is claimed.

## Qualified refrigeration and regulatory review

- Confirm EU 2024/573 Annex I CO₂e and Annex II-1 mass treatment for mixed refrigerants, including multiple HFC and multiple HFO components.
- Confirm hermetic `or` interpretation for mixed cases; the engine blocks conflicting cases instead of claiming exemption.
- Review ODS rules, restrictions on adding refrigerant, and the distinction between continued operation, servicing and placing new equipment on the market.
- Review future effective dates, reclaimed/recycled exceptions, equipment categories, capacities and safety exceptions. Restriction notices are contextual information, not an equipment approval.
- Approve formula inputs, verified nominal blend mass fractions, legal GWP bases, and any source conflicts. Model-derived composition must not silently become a certified nominal recipe.
- Review PED, flammability, oils and thermodynamic data at stated conditions; missing values remain unknown.
- Approve source/reuse terms and coverage denominator before making a comprehensive ASHRAE coverage claim.

## Product validation outside automated browser tests

- Install on an actual iOS and Android phone; force-close, enter flight mode, restart from the Home Screen and use search, cards, favourites, comparison and saved calculations.
- Test VoiceOver and TalkBack announcements and focus, increased platform text size, small display and one-handed touch use. Automated axe results alone do not establish WCAG conformance.
- Have 3–5 refrigeration users complete tasks without guidance. Record mistakes, time and unfamiliar terminology.
- Conduct an update rehearsal from an installed prior app/data version, with an open unsaved calculation and stored snapshots. Confirm the update prompt is explicit and stored versions do not change.
- Native Capacitor shells, signing, permissions, store submission and app-store icons are future release work. Capacitor configuration is provided; native installation is not claimed.
