import { Unlockables } from "#enums/unlockables";
import i18next from "i18next";

export function getUnlockableName(unlockable: Unlockables) {
  switch (unlockable) {
    case Unlockables.MINI_BLACK_HOLE:
      return i18next.t("modifierType:ModifierType.MINI_BLACK_HOLE.name");
    case Unlockables.EVIOLITE:
      return i18next.t("modifierType:ModifierType.EVIOLITE.name");
  }
}
