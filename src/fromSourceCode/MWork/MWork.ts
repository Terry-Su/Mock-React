import { isNil } from "../../util/lodash"

/**
 * One-off work
 */
export default class MWork {
  _callbacks: Function[] = null
  _didCommit: boolean = false
  
  then( onCommit: Function ) {
      if ( this._didCommit ) {
          onCommit()
          return
      }
      
      this._callbacks = isNil( this._callbacks ) ? [] : this._callbacks
      this._callbacks.push( onCommit )
  }
  
  // React annoation: TODO: Avoid need to bind by replacing callbacks in the update queue with
  // list of Work objects.
  _onCommit: Function = () => {
      if ( this._didCommit ) {
          return
      }
      
      this._didCommit = true
      
      const { _callbacks: callbacks } = this
      if ( isNil( callbacks ) ) {
          return
      }
      
      callbacks.forEach( callback => callback() )
  }
}