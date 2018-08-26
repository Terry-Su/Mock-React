import { isArray } from "util"
import { MHTMLElement } from "../typings/DOM"
import { notArray, notNil } from "../util/js"
import { isNil } from "lodash"

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

  getHostNode() {
    return this.node
  }

  mount(): MHTMLElement {
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

  unmount() {
    const { renderedChildren } = this
    renderedChildren.forEach( child => child.unmount() )
  }

  receive( nextElement: MHostElement ) {
    const { node, currentElement: preElement } = this
    const { props: prevProps = {} } = preElement
    const { props: nextProps = {} } = nextElement

    this.currentElement = nextElement

    /* Remove old attributes */
    Object.keys( prevProps ).forEach( propName => {
      if ( propName !== 'children' && ! nextProps ) {
        node.removeAttribute( propName )
      }
    } )

    /* Set new attributes */
    Object.keys( nextProps ).forEach( propName => {
      if ( propName !== 'children' ) {
        node.setAttribute( propName, nextProps[ propName ] )
      }
    } )


    /* ============== Deal with props.children ============== */

    /* These are arrays of React elements */
    let { children: prevChildren = [] }  = prevProps
    let { children: nextChildren = [] } = nextProps
    prevChildren = notArray( prevChildren ) ? [ prevChildren ] : prevChildren
    nextChildren = notArray( nextChildren ) ? [ nextChildren ] : nextChildren

    /* These are arrays of internal instances */
    let { renderedChildren: prevRenderedChildren } = this
    let nextRenderedChildren = []

    /* As we iterate over children, we will add operations to the array */
    type Operation = { type: string, node?: MHTMLElement, prevNode?: MHTMLElement, nextNode?: MHostElement }
    type OperationQueue = Operation[]
    let operationQueue: OperationQueue = []


    /* Note: the section below is extremely simplified */
    /* It doesn't handle recorders, children with holes, or keys */
    /* It only exists to inllustrate the overall flow, not the specifics */

    for ( let i = 0; i < nextChildren.length; i++ ) {
      /* Try to get an existing internal instance for this child */
      const prevChild = prevRenderedChildren[ i ]

      /* If there is no internal instance under this index, */
      /* a child has been appended to the end. Create a new */
      /* internal instance, mount it, and use its node */
      if ( isNil( prevChild ) ) {
        const nextChild = instantiateComponent( nextChildren[ i ] )
        const node = nextChild.mount()

        /* Record that we nned to append a node */
        operationQueue.push( { type: 'ADD', node } )

        nextRenderedChildren.push( nextChild )
        continue
      }

      /* We can only update the instance if its element's type matches */
      /* For example, <Button size="small"> can be updated to */
      /* <Button size="large" /> but not to an <App /> */
      const canUpdate = prevChildren[ i ].type === nextChildren[ i ].type

      /* If we can't update an existing instance, we have to unmount it */
      /* and mount a new one instead of it */
      if ( ! canUpdate ) {
        const prevNode = prevChild.getHostNode()
        prevChild.unmount()

        const nextChild = instantiateComponent( nextChildren[ i ] )
        const nextNode = nextChild.mount()

        // Recore that we need to swap the nodes
        operationQueue.push( { type: 'REPLACE', prevNode, nextNode } )

        nextRenderedChildren.push( nextChild )
        continue
      }

      /* If we can update an existing internal instance,  */
      /* just let it receive the next element and handle its own update */
      prevChild.receive( nextChildren[ i ] )
      nextRenderedChildren.push( prevChild )
    }

    /* Finally, unmount any children that dont's exist */
    for ( let j = nextChildren.length; j < prevChildren.length; j++ ) {
      const prevChild = prevRenderedChildren[ j ]
      const node = prevChild.getHostNode()
      prevChild.unmount()

      /* Record that we need to remove the node */
      operationQueue.push( { type: 'REMOVE', node } )
    }

    /* Point the list of rendered children to the updated version */
    this.renderedChildren = nextRenderedChildren


    /* Process the operation queue */
    while ( operationQueue.length > 0 ) {
      const operation = operationQueue.shift()
      const { node } = this
      switch( operation.type ) {
        case 'ADD':
          node.appendChild( operation.node )
          break
        case 'REPLACE':
          node.replaceChild( operation.nextNode, operation.prevNode )
          break
        case 'REMOVE':
          node.removeChild( operation.node )
          break
      }
    }
  }
}

export class CompositeComponent {
  currentElement: MCompositeElement
  renderedComponent: any

  constructor( element: MCompositeElement ) {
    this.currentElement = element
  }

  getHostNode() {
    return this.renderedComponent.getHostNode()
  }

  mount() {
    const { type, props } = this.currentElement
    const renderElement:MElement  = type( props )
    const renderedComponent: any = instantiateComponent( renderElement )
    this.renderedComponent = renderedComponent

    return renderedComponent.mount()
  }

  unmount() {
    const { renderedComponent } = this
    renderedComponent.unmount()
  }

  receive( nextElement: MCompositeElement ) {
    const { currentElement: prevElement, renderedComponent: prevRenderedComponent  } = this
    const { type: prevType, props: prevProps } = prevElement
    const { type, props: nextProps } = nextElement

    /* Updaet *own* element */
    this.currentElement = nextElement
    
    /* Firgure out what the next render() output is */
    let nextRenderedElement
    if ( typeof type === 'function' ) {
      nextRenderedElement = type( nextProps )
    }

    /* If the rendered type  */
    if ( prevRenderedComponent.type === nextRenderedElement.type ) {
      prevRenderedComponent.receive( nextRenderedElement )
      return
    }


    /* If we reached this point, we need to */
    /* unmount the previously mounted component, */
    /* mount the new one, and swap their nodes */

    /* Find the old node because it will need to be replaced  */
    let prevNode = prevRenderedComponent.getHostNode()

    prevRenderedComponent.unmount()
    nextRenderedElement = instantiateComponent( nextRenderedElement )
    let nextNode = nextRenderedElement.mount()

    /* Replace the reference to the child */
    this.renderedComponent = nextRenderedElement

    /* Replace the old node with the new one */
    /* Note: this is renderer-specific code and */
    /* ideally should live outside of CompositeComponent */
    prevNode.parentNode.replaceChild( nextNode, prevNode )

  }

  
}