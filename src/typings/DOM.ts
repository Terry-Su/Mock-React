import { DOMComopnent, CompositeComponent } from "../m-tmp/component"

export interface MNode extends Node {
  _internalInstance?: DOMComopnent | CompositeComponent
}