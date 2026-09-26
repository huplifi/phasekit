# PhaseKit field pilot guide

Status: ready for use; no pilot sessions or physical-device results are claimed here. Recruit 3–5 refrigeration professionals who have not worked on the interface. Use the beta URL and record its visible build label, date, language, device, browser and whether the app was installed to the Home Screen. Do not enter customer names, addresses or live service records into a public beta unless the tester has permission to do so.

## Session format

Give each participant a short introduction: "Use PhaseKit as you would during a service visit. Say what you expect each result to mean. You can stop whenever a value or claim seems unsafe." Let them work without coaching; ask for their interpretation after each task. Use fictional equipment and the fixed examples below. Record the exact input, unit, pressure reference, observed output, mistakes, terminology questions and time to complete. A facilitator should distinguish a calculator error from confusion about a regulation or the test scenario.

| Task | Scenario and prompt | What to observe |
| --- | --- | --- |
| Find and assess | Find R513A. For 50 kg in stationary refrigeration, no detector or hermetic exemption, use the current assessment date. Ask which branch controls the interval and where the sources are. | The [decision record](RULES.md) expects 6 months from the Annex II-1 fraction. Ask whether the result makes its scope and assumptions clear; do not coach with this answer first. |
| Pressure and temperature | Find an available P–T refrigerant. Enter a negative temperature, switch units and pressure reference, then explain the atmospheric reference. | Keyboard access to minus/comma, unit/absolute versus gauge understanding, source and range messages. Capture the exact refrigerant and values for any disputed result. |
| Field calculation | Use a 20 mm internal diameter, 10 m pipe and 0.5 l/s. Print the result directly, then save a copy with a fictional equipment label and note. | Expected bounded geometry is about 3.14159 l and 1.59155 m/s; the user should not read this as pipe sizing. Check that print, saved title, units, note and source survive reopening. |
| Checklist | Create an evacuation checklist. Enter a fictional equipment identifier, technician/date, instructions and a measurement; mark only some steps complete. Reload, reopen and print. | Whether automatic local saving and incomplete status are obvious; whether print preserves observations and does not imply a passed test. |
| Installed/offline | On an actual iOS or Android phone, install after an online load, force-close, enter flight mode, reopen, then revisit a saved result. Return online and rehearse an update with an unsaved form. | Record actual keyboard, touch, focus, text-size, offline, data-retention and update behaviour. Browser emulation does not count as a device result. |

Use both Finnish and English across participants, and include light and dark themes. At least one session should use VoiceOver or TalkBack and enlarged text. The facilitator should record what assistive technology announced, where focus moved, and any action that could not be completed.

## Observation record

Copy this block for each participant and task:

```text
Pilot ID (anonymous):
Date / beta build label / URL:
Device / OS / browser / installed or browser tab:
Language / theme / text size / assistive technology:
Task and exact fictional inputs with units:
Expected behaviour from the cited source or product contract:
Observed behaviour and participant interpretation:
Unprompted errors, pauses or help requests:
Time and completion (completed / completed with help / blocked):
Screenshot or exported report reference (redacted):
Severity (blocks safe use / major friction / minor friction):
Follow-up owner and disposition:
```

Keep the raw observation separate from the team's diagnosis. Reproduce a suspected calculation defect with the same data and rule/data version, then compare it with an independent source. Do not "correct" a participant's legal interpretation inside the notes without a qualified review.

## Exit decision

Summarise the 3–5 sessions with counts of blocked tasks, serious interpretation mistakes and repeated UI friction. List every open issue and its owner. A field pilot informs usability; it does not replace the qualified regulatory review in [release gates](RELEASE-GATES.md) or prove physical accuracy of thermodynamic models.
