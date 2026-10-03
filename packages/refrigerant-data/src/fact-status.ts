import type { Fact, Refrigerant } from "../../core/src/contracts";

export type RefrigerantFactKey =
  "glide" | "density" | "ped" | "lfl" | "autoignition" | "safety" | "family";
export type RefrigerantFactDescription = {
  state:
    "known" | "known_absent" | "not_applicable" | "missing" | "unclassified";
  text: string;
  detail?: string;
  fact?: Fact;
};

const keys: Record<Exclude<RefrigerantFactKey, "family">, string> = {
  glide: "nominal_glide_k",
  density: "normal_density_kg_m3",
  ped: "ped_fluid_group",
  lfl: "lower_flammability_limit_vol_pct",
  autoignition: "autoignition_c",
  safety: "safetyGroup",
};

export function describeRefrigerantFact(
  refrigerant: Refrigerant,
  key: RefrigerantFactKey,
  locale: "fi" | "en",
): RefrigerantFactDescription {
  const fi = locale === "fi";
  const missingText = fi ? "Tieto puuttuu" : "Data unavailable";
  if (key === "family")
    return refrigerant.family && refrigerant.family !== "unclassified"
      ? { state: "known", text: refrigerant.family }
      : {
          state: "unclassified",
          text: missingText,
        };
  const fact =
    refrigerant.facts[keys[key]] ??
    (key === "safety" ? refrigerant.facts.ashrae_safety_group : undefined);
  if (!fact || fact.state === "unknown") {
    const classification = key === "safety" || key === "ped";
    return {
      state: classification ? "unclassified" : "missing",
      text: missingText,
      ...(key === "ped"
        ? {
            detail: fi
              ? "PED-fluidiryhmä 1 tai 2 perustuu painelaitedirektiivin 2014/68/EU 13 artiklaan. Se ei ole kylmäaineen turvallisuusluokka."
              : "PED fluid group 1 or 2 is defined in Article 13 of Directive 2014/68/EU. It is separate from refrigerant safety class.",
          }
        : {}),
      ...(fact ? { fact } : {}),
    };
  }
  if (
    key === "glide" &&
    fact.state === "not_applicable" &&
    refrigerant.kind === "pure"
  )
    return {
      state: "known_absent",
      text: fi ? "Ei liukumaa" : "No glide",
      detail: fi
        ? "Yksikomponenttisen aineen kupla- ja kastepistelämpötila ovat samassa paineessa samat; tämä päätelmä perustuu varmennettuun puhtaan aineen tunnistukseen."
        : "A pure refrigerant has the same bubble- and dew-point temperature at a given pressure; this follows from its verified single-component identity.",
      fact,
    };
  if (fact.state === "not_applicable")
    return {
      state: "not_applicable",
      text: fi ? "Ei sovellu" : "Not applicable",
      detail:
        key === "lfl" || key === "autoignition"
          ? fi
            ? "Merkintä koskee tätä ominaisuutta; se ei yksin todista yleistä palamattomuutta."
            : "This status concerns this property only; it does not establish general non-flammability."
          : undefined,
      fact,
    };
  if (fact.value === null)
    return {
      state: "missing",
      text: missingText,
      fact,
    };
  const value = String(fact.value);
  if (key === "glide" && Number(value) === 0)
    return {
      state: "known_absent",
      text: fi ? "Ei liukumaa" : "No glide",
      detail: conditionDetail(fact, locale),
      fact,
    };
  if (key === "density") {
    const c = fact.conditions;
    if (
      !c ||
      c.temperatureC === undefined ||
      c.pressureKPaAbsolute === undefined ||
      !c.phase ||
      !c.method ||
      !fact.unit
    )
      return {
        state: "missing",
        text: missingText,
        detail: fi
          ? "Tallennettua lukuarvoa ei näytetä ilman yksikköä, olomuotoa, lämpötilaa, absoluuttista painetta ja menetelmää."
          : "The stored number is withheld until unit, phase, temperature, absolute pressure and method are available.",
        fact,
      };
    return {
      state: "known",
      text: `${value} ${fact.unit}`,
      detail: conditionDetail(fact, locale),
      fact,
    };
  }
  const unit = fact.unit ? ` ${fact.unit}` : "";
  return {
    state: "known",
    text:
      key === "ped"
        ? fi
          ? `Fluidiryhmä ${value}`
          : `Fluid group ${value}`
        : `${value}${unit}`,
    detail:
      key === "ped"
        ? fi
          ? "Painelaitedirektiivin 2014/68/EU 13 artiklan mukainen fluidiryhmä. Ei kylmäaineen turvallisuusluokka."
          : "Fluid group under Article 13 of Directive 2014/68/EU. Separate from refrigerant safety class."
        : conditionDetail(fact, locale),
    fact,
  };
}

function conditionDetail(fact: Fact, locale: "fi" | "en"): string | undefined {
  const c = fact.conditions;
  if (!c) return undefined;
  const parts = [
    c.phase,
    c.temperatureC === undefined ? undefined : `${c.temperatureC} °C`,
    c.pressureKPaAbsolute === undefined
      ? undefined
      : `${c.pressureKPaAbsolute} kPa(a)`,
    c.method,
  ].filter(Boolean);
  return parts.length
    ? `${locale === "fi" ? "Olosuhteet" : "Conditions"}: ${parts.join(" · ")}`
    : undefined;
}
