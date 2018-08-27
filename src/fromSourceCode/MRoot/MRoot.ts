import MWork from "../MWork/MWork"
import { isNil } from "../../util/lodash"
import { notNil } from "../../util/js"
import MBatch from "../MBatch/MBatch"

const DOMRenderer: any = {}

export default class MRoot {
  _internalRoot: any

  constructor( container: any, isAsync: boolean, hydrate: boolean ) {
    this._internalRoot = DOMRenderer.creaetContainer( container, isAsync, hydrate )
  }

  render(
    children: MNodeList,
    callback: Function = null
  ):MWork {
    const { _internalRoot: root } = this
    const work = new MWork()

    notNil( callback ) && work.then( callback )

    DOMRenderer.updateContainer( children, root, null, work._onCommit )
    return work
  }

  unmount( callback: Function = null ): MWork  {
    const { _internalRoot: root } = this
    const work = new MWork()

    notNil( callback ) && work.then( callback )
 
    DOMRenderer.updateContainer( null, root, null, work._onCommit )
    return work
  }

  legacy_renderSubtreeIntoContainer(
    parentComponent: M$Component,
    children: MNodeList,
    callback: Function = null
  ): MWork {
    const { _internalRoot: root } = this
    const work = new MWork()

    notNil( callback ) && work.then( callback )
    
    DOMRenderer.updateContainer( children, root, parentComponent, work._onCommit )
    return work
  }

  createBatch() {
    const batch = new MBatch( this )
    const { _expirationTime: expirationTime } = batch

    const { _internalRoot: internalRoot } = this
    const { firstBatch } = internalRoot

    if ( isNil( firstBatch ) ) {
      internalRoot.firstBatch = batch
      batch._next = null
    }
    if ( notNil( firstBatch ) ) {
      // Insert sorted by expiration time then insertion order
      let insertAfter = null
      let insertBefore = firstBatch

      while(
        notNil( insertBefore ) &&
        insertBefore._expirationTime <= expirationTime
      ) {
        insertAfter = insertBefore
        insertBefore = insertBefore._next
      }
      batch._next = insertBefore
      if ( notNil( insertAfter ) ) {
        insertAfter._next = batch
      }
    }

    return batch
  }

}