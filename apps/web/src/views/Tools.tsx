import { useApp } from "../context";
import { ToolMenu } from "../components/Common";
import { refinementText } from "../../../../packages/i18n/src/refinements";

export function Tools() {
  const { t, data } = useApp();
  return (
    <>
      <h1>{t("tools")}</h1>
      <p className="secondary">
        {refinementText(data.locale, "toolSelectionIntro")}
      </p>
      <ToolMenu />
    </>
  );
}
