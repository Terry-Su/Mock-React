import { place } from "../../../util/__test__"
import { createUpdate, Update, UpdateQueue, createUpdateQueue, appendUpdateToQueue } from "../MUpdateQueue"

describe( 'MUpdateQueue', () => {
  it( 'createUpdate', () => {
    const update: Update<State> = createUpdate( Date.now() )
    place( update )
  } )

  it( 'createUpdateQueue', () => {
    const state: any = { count: 0 }
    const updateQueue: UpdateQueue<State> = createUpdateQueue( state )
    place( updateQueue )
  } )

  it( 'appendUpdateToQueue', () => {
    const update: Update<State> = createUpdate( Date.now() )
    
    const state: any = { count: 0 }
    const updateQueue: UpdateQueue<State> = createUpdateQueue( state )

    appendUpdateToQueue( updateQueue, update )
    place( updateQueue )
  } )
} )

