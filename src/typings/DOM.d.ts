import { DOMComopnent, CompositeComponent } from "../m-tmp/component"

interface MHTMLElement extends HTMLElement {
  _internalInstance?: DOMComopnent | CompositeComponent
}