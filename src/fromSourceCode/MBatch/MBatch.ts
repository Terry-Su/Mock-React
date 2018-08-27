import MWork from "../MWork/MWork"
import { isNil } from "../../util/lodash"
import MRoot from "../MRoot/MRoot"

const DOMRenderer: any = {}

export default class MBatch {
  // React annoation: The ReactRoot constuctor is hoisted but the prototype methods are not. If
  // we move ReactRoot to be above ReactBatch, the inverse error occurs.
  // $FlowFixMe Hoisting issue.
  _root: any 
  _hasChildren: boolean
  _children: MNodeList

  _callbacks: Function[]
  _didComplete: boolean

  _expirationTime = DOMRenderer.computeUniqueAsyncExpiration()
  _next: any = null
  _defer: boolean = true

  constructor( root: MRoot ) {
    this._root = root
  }

  render( children: MNodeList ): MWork {
    this._hasChildren = true
    this._children = children

    const { _internalRoot: internalRoot } = this._root
    const { _expirationTime: expirationTime } = this
    const work = new MWork()
    DOMRenderer.updateContainerAtExpirationTime(
      children,
      internalRoot,
      null,
      expirationTime,
      work._onCommit
    )
    return work
  }

  then( onComplete: Function ) {
    if ( this._didComplete ) {
      onComplete()
      return
    }

    this._callbacks = isNil( this._callbacks ) ? [] : this._callbacks
    this._callbacks.push( onComplete )
  }  

  commit() {
    const { _internalRoot: internalRoot } = this._root
    let firstBatch = internalRoot.firstBatch

    if ( ! this._hasChildren ) {
      // This batch is empty. Return.
      this._next = null
      this._defer = false
      return
    }

    let { _expirationTime: expirationTime } = this

    // Ensure this is the first batch in the list
    if ( firstBatch !== this ) {

      if ( this._hasChildren ) {
        // This batch is not the earliest batch. We nned to move it to the front.
        // Update its expiration time to be the expiration time of the earliest
        // batch, so that we can flush it without flushing the other batches
        this._expirationTime = firstBatch._expirationTime

        // Rendering this batch again ensures its children will be the final state
        // when we flush( updates are processed in insertion order: last update wins ).
        // React annotation: TODO: This forces a restart. Should we print a warning?
        this.render( this._children )
      }

      // Remove the batch from the list
      let previous = null
      let batch = firstBatch

      while ( batch !== this ) {
        previous = batch
        batch = batch._next
      }

      previous._next = batch._next


      // Add it to the front.
      this._next = firstBatch
      internalRoot.firstBatch = this
      firstBatch = this
    }

    // Synchronously flush all the work up to this batch's expiration time
    this._defer = false
    DOMRenderer.flushRoot( internalRoot, expirationTime )

    // Pop the batch from the list
    const { _next: next } = this
    this._next = null
    internalRoot.firstBatch = next
    firstBatch = next

    // Append the next earliest batch's children to the update queue.
    if ( firstBatch !== null && firstBatch._hasChildren ) {
      firstBatch.render( firstBatch._children )
    }
  }

  _onComplete() {
    if ( this._didComplete ) {
      return
    }

    this._didComplete = true
    const { _callbacks: callbacks } = this
    if ( isNil( callbacks ) ) {
      return
    }

    // React annotation: TODO: Error handling
    callbacks.forEach( callback => callback() )
  }
}

