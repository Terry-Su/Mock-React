import { MHTMLElement } from '../typings/DOM'

export default function unmountTree( containerNode: HTMLElement ) {
  let node = <MHTMLElement>containerNode.firstChild
  let rootComponent = node._internalInstance

  rootComponent.unmount()
  containerNode.innerHTML = ''
}