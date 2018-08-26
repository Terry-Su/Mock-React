import { instantiateComponent } from "./component"
import unmountTree from "./unmountTree"

export default function( element: MElement, containerNode: HTMLElement ) {
  /* Destroy any existing tree */
  containerNode.firstChild && unmountTree( containerNode )

  const rootComponent = instantiateComponent( element )
  const node = rootComponent.mount()
  containerNode.appendChild( node )

  /* Save a reference to the internal instance */
  node._internalInstance = rootComponent
}