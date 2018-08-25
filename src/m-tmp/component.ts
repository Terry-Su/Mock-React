import { isArray } from "util"

export function instantiateComponent( element: MElement ) {
  const { type } = element
    if ( typeof type === 'string' ) {
      return new DOMComopnent( <MHostElement>element )
    }
    if ( typeof type === 'function' ) {
      return new CompositeComponent( <MCompositeElement>element )
    }
}

export class DOMComopnent {
  currentElement: MHostElement
  renderedChildren: any[]
  node: HTMLElement

  constructor( element: MHostElement ) {
    this.currentElement = element
  }

  mount() {
    const { type, props = {} } = this.currentElement
    let { children = [] } = props

    const node = document.createElement( type )
    this.node = node

    /* Set attrinutes to node */
    for ( let propName in props ) {
      propName !== 'children' && node.setAttribute( propName, props[ propName ] )
    }

    /* Get rendered children,  */
    // Resolve the situation that children aren't array(such as string)
    children = isArray( children ) ? children : [ children ]

    const renderedChildren = children.map( instantiateComponent )
    this.renderedChildren = renderedChildren

    /* Set child nodes to node */
    const childeNodes = renderedChildren.map( ( child: any ) => child.mount() )
    childeNodes.forEach( ( childeNode: HTMLElement ) => node.appendChild( childeNode ) )

    return node
  }
}

export class CompositeComponent {
  currentElement: MCompositeElement
  renderedComponent: any

  constructor( element: MCompositeElement ) {
    this.currentElement = element
  }

  mount() {
    const { type, props } = this.currentElement
    const renderElement:MElement  = type( props )
    const renderedComponent: any = instantiateComponent( renderElement )
    this.renderedComponent = renderedComponent

    return renderedComponent.mount()
  }
}