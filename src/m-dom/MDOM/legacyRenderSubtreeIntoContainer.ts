import MRoot from "../../fromSourceCode/MRoot/MRoot"
import { isNil } from "../../util/lodash"
import { ELEMENT_NODE } from "../shared/constant/HTMLNodeType"
import { ROOT_ATTRIBUTE_NAME } from "../shared/constant/DOMProperty"
import getMRootElementInContainer from "./getMRootElementInContainer"
import { notNil } from "../../util/js"

const DOMRenderer: any = {}

export default function (
  parentComponent: M$Component,
  children: MNodeList,
  container: DOMContainer,
  forceHydrate: boolean,
  callback?: Function
) {
  // React anotation: TODO: Without `any` type, Flow says "Property cannot be accessed on any member of intersection type." Whyyyyyy.
  let root: MRoot = container._mRootContainer

  if ( isNil( root ) ) {
    // Initial mount
    container._mRootContainer = legacyCreateRootFromDOMContainer(
      container,
      forceHydrate
    )

    if ( typeof callback === 'function' ) {
      const originalCallback = callback
      callback = () => {
        const instance = DOMRenderer.getPublickRootInstance( root._internalRoot )
        originalCallback.call( instance )
      }
    }

    // Initial mount should not be batched
    DOMRenderer.unbatchedUpdates( () => {
      if ( notNil( parentComponent ) ) {
        root.legacy_renderSubtreeIntoContainer(
          parentComponent,
          children,
          callback
        )
      }
      if ( isNil( parentComponent ) ) {
        root.render( children, callback )
      }
    } )
  }

  if ( notNil( root ) ) {
    if ( typeof callback === 'function' ) {
      const originalCallback = callback
      callback = () => {
        const instance = DOMRenderer.getPublickRootInstance( root._internalRoot )
        originalCallback.call( instance )
      }
    }

    // Update
    if ( notNil( parentComponent ) ) {
      root.legacy_renderSubtreeIntoContainer(
        parentComponent,
        children,
        callback
      )
    }
    if ( isNil( parentComponent ) ) {
      root.render( children, callback )
    }

    return DOMRenderer.getPublickRootInstance(  root._internalRoot )
  }
  
}


function legacyCreateRootFromDOMContainer(
  container: DOMContainer,
  forceHydrate: boolean,
): MRoot {
  const shouldHydrate =
    forceHydrate || shouldHydrateDueToLegacyHeuristic( container )
  // First clear any existing content.
  if ( !shouldHydrate ) {
    let rootSibling
    while ( ( rootSibling = container.lastChild ) ) {
      container.removeChild( rootSibling )
    }
  }
  // Legacy roots are not async by default.
  const isAsync = false
  return new MRoot( container, isAsync, shouldHydrate )
}

function shouldHydrateDueToLegacyHeuristic( container: DOMContainer ) {
  const rootElement = getMRootElementInContainer( container )
  return !!(
    rootElement &&
    rootElement.nodeType === ELEMENT_NODE &&
    rootElement.hasAttribute( ROOT_ATTRIBUTE_NAME )
  )
}