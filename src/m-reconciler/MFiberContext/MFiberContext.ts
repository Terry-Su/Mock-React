export const emptyContextObject = {}

function findCurrentUnmaskedContext( fiber: Fiber ): Object {
  let node = fiber
  do {
    switch ( node.tag ) {
      case HostRoot:
        return node.stateNode.context
      case ClassComponent: {
        const Component = node.type
        if ( isContextProvider( Component ) ) {
          return node.stateNode.__reactInternalMemoizedMergedChildContext
        }
        break
      }
      case ClassComponentLazy: {
        const Component = getResultFromResolvedThenable( node.type )
        if ( isContextProvider( Component ) ) {
          return node.stateNode.__reactInternalMemoizedMergedChildContext
        }
        break
      }
    }
    node = node.return
  } while ( node !== null )
}

export {
  findCurrentUnmaskedContext
}