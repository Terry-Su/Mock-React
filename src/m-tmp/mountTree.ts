import { instantiateComponent } from "./component"
import unmountTree from "./unmountTree"
import { MHTMLElement } from "../typings/DOM"

export default function( element: MElement, containerNode: HTMLElement ) {
  /* Check for an existing tree */
  if ( containerNode.firstChild ) {
    const prevNode = <MHTMLElement>containerNode.firstChild
    const { _internalInstance: prevRootComponent }: any = prevNode
    const { currentElement: prevElement } = prevRootComponent

    /* If we can, reuse the existing root component */
    if ( prevElement.type === element.type ) {
      prevRootComponent.receive( element )
      return
    }

    /* Otherwise, unmount the existing tree */
    unmountTree( containerNode )
  }
  
  const rootComponent = instantiateComponent( element )
  const node = rootComponent.mount()
  containerNode.appendChild( node )

  /* Save a reference to the internal instance */
  node._internalInstance = rootComponent
}