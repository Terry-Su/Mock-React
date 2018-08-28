import { isNil } from "../../util/lodash"
import { emptyContextObject } from "../MFiberContext/MFiberContext"

import * as MInstanceMap from '../shared/MInstanceMap'

export default function updateContainerAtExpirationTime(
  element: MNodeList,
  container: FiberRoot,
  parentComponent: M$Component,
  expirationTime: ExpirationTime,
  callback ?: Function
) {
  // React annotation: If this is a nested container, this won't be the root.
  const { current } = container

  const context = getContextForSubtree( parentComponent )

  if ( isNil( container.context ) ) {
    container.context = context
  } else {
    container.pendingContext = context
  }

  // return scheduleRootUpdate( current, element, expirationTime, callback )
}

function getContextForSubtree(
  parentComponent: M$Component
): any {
  // if ( !parentComponent ) {
  //   return emptyContextObject
  // }

  // const fiber = MInstanceMap.get( parentComponent )
  // const parentContext = findCurrentUnmaskedContext( fiber )

  // if ( fiber.tag === ClassComponent ) {
  //   const Component = fiber.type
  //   if ( isLegacyContextProvider( Component ) ) {
  //     return processChildContext( fiber, Component, parentContext )
  //   }
  // } else if ( fiber.tag === ClassComponentLazy ) {
  //   const Component = getResultFromResolvedThenable( fiber.type )
  //   if ( isLegacyContextProvider( Component ) ) {
  //     return processChildContext( fiber, Component, parentContext )
  //   }
  // }

  // return parentContext
}
