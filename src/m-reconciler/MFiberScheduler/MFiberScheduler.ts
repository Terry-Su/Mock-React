import { now } from "../MFiberHostConfig"
import { msToExpirationTime, NoWork, Sync, Never, computeInteractiveExpiration, computeAsyncExpiration } from "../MFiberExpirationTime/MFiberExpirationTime"
import Fiber from "../MFiber/Fiber"
import { AsyncMode } from "../constant/MTypeOfMode"

// Represents the expiration time that incoming updates should use. (If this
// is NoWork, use the default strategy: async updates in async mode, sync
// updates in sync mode.)
let expirationContext: ExpirationTime = NoWork
let isWorking: boolean = false

// The time at which we're currently rendering work.
let nextRenderExpirationTime: ExpirationTime = NoWork


let nextRoot: FiberRoot = null

let isCommitting: boolean = false

let isBatchingInteractiveUpdates: boolean = false

let lowestPendingInteractiveExpirationTime: ExpirationTime = NoWork

function computeExpirationForFiber( currentTime: ExpirationTime, fiber: Fiber ) {
  let expirationTime
  if ( expirationContext !== NoWork ) {
    // An explicit expiration context was set;
    expirationTime = expirationContext
  } else if ( isWorking ) {
    if ( isCommitting ) {
      // Updates that occur during the commit phase should have sync priority
      // by default.
      expirationTime = Sync
    } else {
      // Updates during the render phase should expire at the same time as
      // the work that is being rendered.
      expirationTime = nextRenderExpirationTime
    }
  } else {
    // No explicit expiration context was set, and we're not currently
    // performing work. Calculate a new expiration time.
    if ( fiber.mode & AsyncMode ) {
      if ( isBatchingInteractiveUpdates ) {
        // This is an interactive update
        expirationTime = computeInteractiveExpiration( currentTime )
      } else {
        // This is an async update
        expirationTime = computeAsyncExpiration( currentTime )
      }
      // If we're in the middle of rendering a tree, do not update at the same
      // expiration time that is already rendering.
      if ( nextRoot !== null && expirationTime === nextRenderExpirationTime ) {
        expirationTime += 1
      }
    } else {
      // This is a sync update
      expirationTime = Sync
    }
  }
  if ( isBatchingInteractiveUpdates ) {
    // This is an interactive update. Keep track of the lowest pending
    // interactive expiration time. This allows us to synchronously flush
    // all interactive updates when needed.
    if (
      lowestPendingInteractiveExpirationTime === NoWork ||
      expirationTime > lowestPendingInteractiveExpirationTime
    ) {
      lowestPendingInteractiveExpirationTime = expirationTime
    }
  }
  return expirationTime
}



/* ============ Sperate line ============ */




// Linked-list of roots
let firstScheduledRoot: FiberRoot = null
let lastScheduledRoot: FiberRoot = null

let nextFlushedRoot: FiberRoot = null
let nextFlushedExpirationTime: ExpirationTime = NoWork

let isRendering: boolean = false

let originalStartTimeMs: number = now()
let currentRendererTime: ExpirationTime = msToExpirationTime(
  originalStartTimeMs,
)
let currentSchedulerTime: ExpirationTime = currentRendererTime






function requestCurrentTime() {
  // requestCurrentTime is called by the scheduler to compute an expiration
  // time.
  //
  // Expiration times are computed by adding to the current time (the start
  // time). However, if two updates are scheduled within the same event, we
  // should treat their start times as simultaneous, even if the actual clock
  // time has advanced between the first and second call.

  // In other words, because expiration times determine how updates are batched,
  // we want all updates of like priority that occur within the same event to
  // receive the same expiration time. Otherwise we get tearing.
  //
  // We keep track of two separate times: the current "renderer" time and the
  // current "scheduler" time. The renderer time can be updated whenever; it
  // only exists to minimize the calls performance.now.
  //
  // But the scheduler time can only be updated if there's no pending work, or
  // if we know for certain that we're not in the middle of an event.

  if ( isRendering ) {
    // We're already rendering. Return the most recently read time.
    return currentSchedulerTime
  }
  // Check if there's pending work.
  findHighestPriorityRoot()
  if (
    nextFlushedExpirationTime === NoWork ||
    nextFlushedExpirationTime === Never
  ) {
    // If there's no pending work, or if the pending work is offscreen, we can
    // read the current time without risk of tearing.
    recomputeCurrentRendererTime()
    currentSchedulerTime = currentRendererTime
    return currentSchedulerTime
  }
  // There's already pending work. We might be in the middle of a browser
  // event. If we were to read the current time, it could cause multiple updates
  // within the same event to receive different expiration times, leading to
  // tearing. Return the last read time. During the next idle callback, the
  // time will be updated.
  return currentSchedulerTime
}



function findHighestPriorityRoot() {
  let highestPriorityWork = NoWork
  let highestPriorityRoot = null
  if ( lastScheduledRoot !== null ) {
    let previousScheduledRoot = lastScheduledRoot
    let root = firstScheduledRoot
    while ( root !== null ) {
      const remainingExpirationTime = root.expirationTime
      if ( remainingExpirationTime === NoWork ) {
        // This root no longer has work. Remove it from the scheduler.

        if ( root === root.nextScheduledRoot ) {
          // This is the only root in the list.
          root.nextScheduledRoot = null
          firstScheduledRoot = lastScheduledRoot = null
          break
        } else if ( root === firstScheduledRoot ) {
          // This is the first root in the list.
          const next = root.nextScheduledRoot
          firstScheduledRoot = next
          lastScheduledRoot.nextScheduledRoot = next
          root.nextScheduledRoot = null
        } else if ( root === lastScheduledRoot ) {
          // This is the last root in the list.
          lastScheduledRoot = previousScheduledRoot
          lastScheduledRoot.nextScheduledRoot = firstScheduledRoot
          root.nextScheduledRoot = null
          break
        } else {
          previousScheduledRoot.nextScheduledRoot = root.nextScheduledRoot
          root.nextScheduledRoot = null
        }
        root = previousScheduledRoot.nextScheduledRoot
      } else {
        if (
          highestPriorityWork === NoWork ||
          remainingExpirationTime < highestPriorityWork
        ) {
          // Update the priority, if it's higher
          highestPriorityWork = remainingExpirationTime
          highestPriorityRoot = root
        }
        if ( root === lastScheduledRoot ) {
          break
        }
        if ( highestPriorityWork === Sync ) {
          // Sync is highest priority by definition so
          // we can stop searching.
          break
        }
        previousScheduledRoot = root
        root = root.nextScheduledRoot
      }
    }
  }

  nextFlushedRoot = highestPriorityRoot
  nextFlushedExpirationTime = highestPriorityWork
}


function recomputeCurrentRendererTime() {
  const currentTimeMs = now() - originalStartTimeMs
  currentRendererTime = msToExpirationTime( currentTimeMs )
}



export {
  computeExpirationForFiber,
  requestCurrentTime
}