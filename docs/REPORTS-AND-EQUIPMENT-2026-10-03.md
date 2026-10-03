# Reports, sites and equipment — beta.7

## Scope and accepted design

The owner requested consistent saved report rows and dedicated detail views, then extended the batch to sites with multiple devices and optional device defaults. Sol implemented the two independent UI/storage areas; Luna adapted existing browser selectors; the parent owned report default rules, integration, verification and release.

- Saved calculations and leak assessments open their own route, with matching Print/PDF and export controls. Their original result, sources and versions remain frozen. Only editable field reports offer locking.
- Site is an explicit grouping entity with name and optional address. Devices can remain unassigned. Existing free-text locations are not converted or merged automatically.
- Optional device details: refrigerant, total charge, manufacturer/model and serial number. Extra form fields are disclosed on demand. No new account, cloud storage, service scheduling or inventory system.
- Selecting a device fills empty draft report fields only. Existing values, work measurements and final reports are preserved. Total charge never becomes added/recovered refrigerant quantity. Device values are defaults to check for the actual work.
- Site deletion unlinks devices and retains their reports. Device changes do not silently revise historical reports. Backups include explicit sites and optional details, while schema-v1 imports remain readable.

## Acceptance and verification

Relevant storage, report-default, route and release-history unit tests; TypeScript; scoped ESLint; one local production build; focused WebKit flows covering site/device creation, report defaults, final-report preservation, mixed-list navigation, dirty-note Back handling, saved exports and print provenance. No full browser matrix or paid preview builds; follow the owner's minimal-test/build-cost instruction. Release uses one beta deployment after local verification. Stable is outside scope.

Runtime results and exact release revision are recorded after verification below.

Verified locally: 33 relevant unit tests passed; TypeScript and ESLint for all changed TypeScript files passed; production build passed (existing large-bundle warning). Eight distinct mobile-WebKit flows passed, including the two existing legacy/final equipment-history flows; the site/device flow also passed desktop WebKit. The new mixed-list flow covers cancelled then accepted browser Back with dirty notes. Two test assumptions were corrected (an already open accordion and the location of preserved original equipment identity); these were test issues, not suppressed product failures. Mobile list/detail/site screenshots were inspected.
