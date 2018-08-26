import { DOMComopnent, CompositeComponent } from "../m-tmp/component"

export interface MHTMLElement extends HTMLElement {
  _internalInstance?: DOMComopnent | CompositeComponent
}