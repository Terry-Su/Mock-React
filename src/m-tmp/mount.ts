import { isArray } from "util"

function mountHost( { type, props = {} }: MHostElement ): HTMLElement {
  let { children = [] } = props

  const node = document.createElement( type )

  /* Set attrinutes to node */
  for ( let propName in props ) {
    propName !== 'children' && node.setAttribute( propName, props[ propName ] )
  }

  /* Recurse children */
  // Resolve the situation that children aren't array(such as string)
  children = isArray( children ) ? children : [ children ]
  children.forEach( ( childElement: MElement ) => {
    const childNode = mount( childElement )
    node.appendChild( childNode )
  } )
  
  return node

}

function mountComposite( { type, props }: MCompositeElement ): HTMLElement {
    const renderElement:MElement  = type( props )
    return mount( renderElement )
}

export function mount( element: MElement ): HTMLElement {
  const { type } = element
  if ( typeof type === 'string' ) {
    return mountHost( <MHostElement>element )
  }
  if ( typeof element === 'function' ) {
    return mountComposite( <MCompositeElement>element )
  }
}


