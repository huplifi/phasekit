import { expect, it } from "vitest";
import {
  createMeasurement,
  type ElectricalSession,
} from "../apps/web/src/electrical";
import { emptyData, parseBackup } from "../apps/web/src/storage";

it("backup roundtrip preserves explicit point groups and leaves legacy readings independent", () => {
  const session: ElectricalSession = {
    id: "session-1",
    siteName: "Site",
    equipmentName: "",
    technician: "Technician",
    meter: { brand: "Fluke", model: "1663", serialNumber: "123" },
  };
  const continuity = {
    ...createMeasurement(session),
    pointId: "point-1",
    point: "Circuit 1",
    result: "0,2",
  };
  const voltage = {
    ...createMeasurement(session, "voltage"),
    pointId: "point-1",
    point: "Circuit 1",
    result: "230",
  };
  const legacy = {
    ...createMeasurement(session),
    point: "Circuit 1",
    result: "0,3",
  };
  const restored = parseBackup(
    JSON.stringify({
      ...emptyData(),
      electricalMeasurements: [continuity, voltage, legacy],
      electricalSession: { ...session, activeMeasurementId: continuity.id },
    }),
  );
  expect(restored.electricalMeasurements).toEqual([
    continuity,
    voltage,
    legacy,
  ]);
  expect(restored.electricalSession?.activeMeasurementId).toBe(continuity.id);
  expect(restored.electricalMeasurements![2]).not.toHaveProperty("pointId");
});
