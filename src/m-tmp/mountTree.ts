import { instantiateComponent } from "./component"

export default function( element: MElement, containerNode: HTMLElement ) {
  const rootComponent = instantiateComponent( element )
  const node = rootComponent.mount()
  containerNode.appendChild( node )
}