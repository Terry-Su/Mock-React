import { isNil } from "../../util/lodash"
import Fiber from "../MFiber/Fiber"
import { notNil } from "../../util/js"
import { ShouldCapture, DidCapture, Callback } from "../constant/MTypeOfSideEffect"
import { NoWork } from "../MFiberExpirationTime/MFiberExpirationTime"

// UpdateQueue is a linked list of prioritized updates.
//
// Like fibers, update queues come in pairs: a current queue, which represents
// the visible state of the screen, and a work-in-progress queue, which is
// can be mutated and processed asynchronously before it is committed — a form
// of double buffering. If a work-in-progress render is discarded before
// finishing, we create a new work-in-progress by cloning the current queue.
//
// Both queues share a persistent, singly-linked list structure. To schedule an
// update, we append it to the end of both queues. Each queue maintains a
// pointer to first update in the persistent list that hasn't been processed.
// The work-in-progress pointer always has a position equal to or greater than
// the current queue, since we always work on that one. The current queue's
// pointer is only updated during the commit phase, when we swap in the
// work-in-progress.
//
// For example:
//
//   Current pointer:           A - B - C - D - E - F
//   Work-in-progress pointer:              D - E - F
//                                          ^
//                                          The work-in-progress queue has
//                                          processed more updates than current.
//
// The reason we append to both queues is because otherwise we might drop
// updates without ever processing them. For example, if we only add updates to
// the work-in-progress queue, some updates could be lost whenever a work-in
// -progress render restarts by cloning from current. Similarly, if we only add
// updates to the current queue, the updates will be lost whenever an already
// in-progress queue commits and swaps with the current queue. However, by
// adding to both queues, we guarantee that the update will be part of the next
// work-in-progress. (And because the work-in-progress queue becomes the
// current queue once it commits, there's no danger of applying the same
// update twice.)
//
// Prioritization
// --------------
//
// Updates are not sorted by priority, but by insertion; new updates are always
// appended to the end of the list.
//
// The priority is still important, though. When processing the update queue
// during the render phase, only the updates with sufficient priority are
// included in the result. If we skip an update because it has insufficient
// priority, it remains in the queue to be processed later, during a lower
// priority render. Crucially, all updates subsequent to a skipped update also
// remain in the queue *regardless of their priority*. That means high priority
// updates are sometimes processed twice, at two separate priorities. We also
// keep track of a base state, that represents the state before the first
// update in the queue is applied.
//
// For example:
//
//   Given a base state of '', and the following queue of updates
//
//     A1 - B2 - C1 - D2
//
//   where the number indicates the priority, and the update is applied to the
//   previous state by appending a letter, React will process these updates as
//   two separate renders, one per distinct priority level:
//
//   First render, at priority 1:
//     Base state: ''
//     Updates: [A1, C1]
//     Result state: 'AC'
//
//   Second render, at priority 2:
//     Base state: 'A'            <-  The base state does not include C1,
//                                    because B2 was skipped.
//     Updates: [B2, C1, D2]      <-  C1 was rebased on top of B2
//     Result state: 'ABCD'
//
// Because we process updates in insertion order, and rebase high priority
// updates when preceding updates are skipped, the final result is deterministic
// regardless of priority. Intermediate state may vary according to system
// resources, but the final state is always the same.


export type Update < State > = {
  expirationTime: ExpirationTime,

  tag: 0 | 1 | 2 | 3,
  payload: any,
  callback: Function,

  next: Update<State>,
  nextEffect: Update<State>
}

export type UpdateQueue < State > = {
  baseState: State,
  
  firstUpdate: Update<State>,
  lastUpdate: Update<State>,

  firstCapturedUpdate: Update<State>,
  lastCapturedUpdate: Update<State>,

  firstEffect: Update<State>,
  lastEffect: Update<State>,

  firstCapturedEffect: Update<State>,
  lastCapturedEffect: Update<State>
}

// Global state that is reset at the beginning of calling `processUpdateQueue`.
// It should only be read right after calling `processUpdateQueue`, via
// `checkHasForceUpdateAfterProcessing`.
let hasForceUpdate = false


export const UpdateState = 0
export const ReplaceState = 1
export const ForceUpdate = 2
export const CaptureUpdate = 3




export function createUpdateQueue<State>( baseState: State ): UpdateQueue< State > {
  const queue: UpdateQueue<State> = {
    baseState,
    firstUpdate        : null,
    lastUpdate         : null,
    firstCapturedUpdate: null,
    lastCapturedUpdate : null,
    firstEffect        : null,
    lastEffect         : null,
    firstCapturedEffect: null,
    lastCapturedEffect : null
  }
  return queue
}

function cloneUpdateQueue<State>( currentQueue: UpdateQueue<State> ): UpdateQueue<State> {
  const queue: UpdateQueue<State> = {
    baseState  : currentQueue.baseState,
    firstUpdate: currentQueue.firstUpdate,
    lastUpdate : currentQueue.lastUpdate,

    // React annotation: TODO: With resuming, if we bail out and resuse the child tree, we should keep these effects.
    firstCapturedUpdate: null,
    lastCapturedUpdate : null,

    firstEffect: null,
    lastEffect : null,

    firstCapturedEffect: null,
    lastCapturedEffect : null
  }

  return queue
}

export function createUpdate( expirationTime: ExpirationTime ): Update<any> {
  return {
    expirationTime,

    tag     : UpdateState,
    payload : null,
    callback: null,

    next      : null,
    nextEffect: null
  }
}


function appendUpdateToQueue<State>(
  queue: UpdateQueue<State>,
  update: Update<State>
) {
  // Append the update to the end of the list.
  if ( isNil( queue.lastUpdate ) ) {
    // Queue is empty
    queue.lastUpdate = update
    queue.firstUpdate = update
  } else {
    queue.lastUpdate.next = update
    queue.lastUpdate = update
  }
}


export function enqueueUpdate<State>( fiber: Fiber, update: Update<State>  ) {
  // Update queues are created lazily.
  const { alternate } = fiber
  let queue1
  let queue2

  if ( isNil( alternate ) ) {
    // There's only one fiber.
    queue1 = fiber.updateQueue
    queue2 = null

    if ( isNil( queue1 ) ) {
      fiber.updateQueue = createUpdateQueue( fiber.memoizedState )
      queue1 = fiber.updateQueue
    }
  } 
  if ( notNil( alternate ) ) {
    // There are two owners.
    queue1  = fiber.updateQueue
    queue2 = alternate.updateQueue

    if ( isNil( queue1 ) ) {
      if ( isNil( queue2 ) ) {
        // Neither fiber has an update queue. Create new ones.
        fiber.updateQueue = createUpdateQueue( fiber.memoizedState )
        queue1 = fiber.updateQueue

        alternate.updateQueue = createUpdateQueue( alternate.memoizedState )
        queue2 = alternate.updateQueue
      } else {
        // Only one fiber has an update queue. Clone to create a new one.
        fiber.updateQueue = cloneUpdateQueue( queue2 )
        queue1 = fiber.updateQueue
      }
    }

    if ( notNil( queue1 ) ) {
      if ( isNil( queue2 ) ) {
        alternate.updateQueue = createUpdateQueue( alternate.memoizedState )
        queue2 = alternate.updateQueue
      } else {
        // Both owners have an update queue
      }
    }
  }

  if ( isNil( queue2 ) || queue1 === queue2 ) {
    // There's onlhy a single queue.
    appendUpdateToQueue( queue1, update )
  } else {
    // There are 2 queues. We need to append the updte to both queues,
    // while accounting for the persistent structure of the list - we don't
    // want the same update to be added multiple times.
    if ( isNil( queue1.lastUpdate ) || isNil( queue2.lastUpdate ) ) {
      // One of the queues is not empty. We must add the update to both queues.
      appendUpdateToQueue( queue1, update )
      appendUpdateToQueue( queue2, update )
    } else {
      // Both queues are non-empty. The last update is the same in both lists,
      // because of structural sharing. So, only append to one of the lists.
      appendUpdateToQueue( queue1, update )
      // But we still need to update the `lastUpdate` pointer of queue2.
      queue2.lastUpdate = update
    }
  }
}


export function enqueueCapturedUpdate<State>(
  workInProgress: Fiber,
  update: Update<State>
) {
  // Captured updates go into a separate list, and only on the work-in-progress queue.
  let workInProgressQueue = workInProgress.updateQueue

  if ( isNil( workInProgressQueue ) ) {
    workInProgress.updateQueue = createUpdateQueue( workInProgress.memoizedState )
    workInProgressQueue = workInProgress.updateQueue
  }
  if ( notNil( workInProgressQueue ) ) {
    // React annoation: TODO: I put this there rather than createWorkInProgress so that
    // we don't clone the queue unnecessarily. There's probably a better way to structure this.
    workInProgressQueue = ensureWorkInProgressQueueIsAClone(
      workInProgress,
      workInProgressQueue
    )
  }

  // Append the update to the end of the list.
  if ( isNil( workInProgressQueue.lastCapturedUpdate ) ) {
    // This is the first render phase update
    workInProgressQueue.lastCapturedUpdate = update
    workInProgressQueue.firstCapturedUpdate = workInProgressQueue.lastCapturedUpdate
  } else {
    workInProgressQueue.lastCapturedUpdate.next = update
    workInProgressQueue.lastCapturedUpdate = update
  }
}

function ensureWorkInProgressQueueIsAClone<State>(
  workInProgress: Fiber,
  queue: UpdateQueue<State>
): UpdateQueue<State> {
  const { alternate: current } = workInProgress

  if ( notNil( current ) ) {
    // If the work-in-progress queue is equal to the current queue,
    // we need to clone it first.
    if ( queue === current.updateQueue ) {
      workInProgress.updateQueue = cloneUpdateQueue( queue )
      queue = workInProgress.updateQueue
    }
  }

  return queue
}


function getStateFromUpdate<State>(
  workInProgress: Fiber,
  queue: UpdateQueue<State>,
  update: Update<State>,
  prevState: State,
  nextProps: any,
  instance: any
): any {
  switch( update.tag ) {
    case ReplaceState: {
      const { payload } = update

      if ( typeof payload === 'function' ) {
        return payload.call( instance, prevState, nextProps )
      }

      // State object
      return payload
    }

    case CaptureUpdate: {
      workInProgress.effectTag = ( workInProgress.effectTag & ~ShouldCapture ) | DidCapture
    }

    // Intentional fallthrough
    case UpdateState: {
      const { payload } = update
      let partialState

      if ( typeof payload === 'function' ) {
        // Updater function
        partialState = payload.call( instance, prevState, nextProps )
      } else {
        // Partial state object
        partialState = payload
      }

      if ( isNil( partialState ) ) {
        // Null and undefined are treated as no-ops
        return prevState
      }
      // Merge the partial state and the previous state.
      return Object.assign( {}, prevState, partialState )
    }

    case ForceUpdate: {
      hasForceUpdate = true
      return prevState
    }
  }
  return prevState
}



export function processUpdateQueue<State>(
  workInProgress: Fiber,
  queue: UpdateQueue<State>,
  props: any,
  instance: any,
  renderExpirationTime: ExpirationTime
) {
  hasForceUpdate = false

  queue = ensureWorkInProgressQueueIsAClone( workInProgress, queue )

  // These values may change as we process the queue.
  let { baseState: newBaseState } = queue
  let newFirstUpdate = null
  let newExpirationTime = NoWork

  // Iterate through the list of updates to compute the result.
  let { firstUpdate: update } = queue
  let resultState = newBaseState

  while ( notNil( update ) ) {
    const { expirationTime: updateExpirationTime } = update

    if ( updateExpirationTime > renderExpirationTime ) {
      // This update does not have sufficient priority. Skip it.
      if ( isNil( newFirstUpdate ) ) {
        // This is the first skipped update. It will be the first update in the new list
        newFirstUpdate = update
        // Since this is the first update that was skipped, the current result is the new base state
        newBaseState = resultState
      }
      // Since this update will remain in the list, update the remaining expiration time.
      if ( newExpirationTime === NoWork || newExpirationTime > updateExpirationTime ) {
        newExpirationTime = updateExpirationTime
      }
    } else {
      // This update does have sufficient priority. Process it and compute a new result.
      resultState = getStateFromUpdate(
        workInProgress,
        queue,
        update,
        resultState,
        props,
        instance
      )

      const { callback } = update
      if ( notNil( callback ) ) {
        workInProgress.effectTag |= Callback
        // Set this to null, in case it was mutated during an aborted render.
        update.nextEffect = null
        if ( isNil( queue.lastEffect ) ) {
          queue.lastEffect = update
          queue.firstEffect = queue.lastEffect
        } else {
          queue.lastEffect.nextEffect = update
          queue.lastEffect = update
        }
      }
    }

    // Continue to the next update
    update = update.next
  }

  // Separately, iterate though the list of captured updates.
  let newFirstCaptureUpdate = null
  update = queue.firstCapturedUpdate

  while ( notNil( update ) ) {
    const { expirationTime: updateExpirationTime } = update
    if ( updateExpirationTime > renderExpirationTime ) {
      // This update does not have sufficient priority. Skip it.
      if ( isNil( newFirstCaptureUpdate ) ) {
        // This is the first skipped captured update. It will be the first update in the new list.
        newFirstCaptureUpdate = update
        // If this is the first update that was skipped, the current result is the new base state.
        if ( isNil( newFirstUpdate ) ) {
          newBaseState = resultState
        }
      }

      // Since this update will remain in the list, update the remaining expiration time.
      if (
        newExpirationTime === NoWork ||
        newExpirationTime > updateExpirationTime
      ) {
        newExpirationTime = updateExpirationTime
      }


    } else {
      // This update does have sufficient priority. Process it and compute a new result.
      resultState = getStateFromUpdate(
        workInProgress,
        queue,
        update,
        resultState,
        props,
        instance
      )
      const { callback } = update
      if ( notNil( callback ) ) {
        workInProgress.effectTag |= Callback
        // Set this to null, in case it was mutated during an aborted render.
        update.nextEffect = null
        if ( isNil( queue.lastCapturedEffect ) ) {
          queue.lastCapturedEffect = update
          queue.firstCapturedEffect = queue.lastCapturedEffect
        } else {
          queue.lastCapturedEffect.nextEffect = update
          queue.lastCapturedEffect = update
        }
      }
    }

    update = update.next
  }

  if ( isNil( newFirstUpdate ) ) {
    queue.lastUpdate = null
  }

  if ( isNil( newFirstCaptureUpdate ) ) {
    queue.lastCapturedUpdate = null
  } else {
    workInProgress.effectTag |= Callback
  }

  if ( isNil( newFirstUpdate ) && isNil( newFirstCaptureUpdate ) ) {
    // We processed every update, without skipping. That means the new base state is the same as the result state.
    newBaseState = resultState
  }

  queue.baseState = newBaseState
  queue.firstUpdate = newFirstUpdate
  queue.firstCapturedUpdate = newFirstCaptureUpdate
  
  // Set the remaining expiration time to be whatever is remaining in the queue.
  // This should be fine because the only two other things that contribute to
  // expiration time are props and context. We're already in the middle of the
  // begin phase by the time we start processing the queue, so we've already
  // dealt with the props. Context in components that specify
  // shouldComponentUpdate is tricky; but we'll have to account for
  // that regardless.
  workInProgress.expirationTime = newExpirationTime
  workInProgress.memoizedState = resultState
}


function callCallback( callback: Function, context: any ) {
  callback.call( context )
}


export function resetHasForceUpdateBeforeProcessing() {
  hasForceUpdate = false
}


export function checkHasForceUpdateAfterProcessing(): boolean {
  return hasForceUpdate
}


export function commitUpdateQueue<State>(
  finishedWork: Fiber,
  finishedQueue: UpdateQueue<State>,
  instance: any,
  renderExpirationTime: ExpirationTime
) {
  // If the finished render included captured updates, and there are still
  // lower priority updates left over, we need to keep the captured updates
  // in the queue so that they are rebased and not dropped once we process the
  // queue again at the lower priority.
  if ( notNil( finishedQueue.firstCapturedUpdate ) ) {
    // Join the captured update list to the end of the normal list.
    if ( notNil( finishedQueue.lastUpdate ) ) {
      finishedQueue.lastUpdate.next = finishedQueue.firstCapturedUpdate
      finishedQueue.lastUpdate = finishedQueue.lastCapturedUpdate
    }
    // Clear the list of captured updates.
    finishedQueue.lastCapturedUpdate = null
    finishedQueue.firstCapturedUpdate = finishedQueue.lastCapturedUpdate
  }

  // Commit the effects
  commitUpdateEffects( finishedQueue.firstEffect, instance )
  finishedQueue.lastEffect = null
  finishedQueue.firstEffect = finishedQueue.lastEffect

  commitUpdateEffects( finishedQueue.firstCapturedEffect, instance )
  finishedQueue.lastCapturedEffect = null
  finishedQueue.firstCapturedEffect = finishedQueue.lastCapturedEffect
}

function commitUpdateEffects<State>(
  effect: Update<State>,
  instance: any
) {
  while( notNil( effect ) ) {
      const { callback } = effect
      if ( notNil( callback ) ) {
        effect.callback = null
        callCallback( callback, instance )
      }
      effect = effect.nextEffect
  }
}