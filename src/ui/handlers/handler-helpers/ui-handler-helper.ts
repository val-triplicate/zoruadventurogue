import type { UiHandler } from "#ui/ui-handler";

export abstract class UiHandlerHelper<H extends UiHandler> {
  protected owner: H;

  constructor(owner: H) {
    this.owner = owner;
  }

  protected getUi() {
    return this.owner.getUi();
  }
}
