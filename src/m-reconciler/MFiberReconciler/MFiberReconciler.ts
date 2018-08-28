import { requestCurrentTime, computeExpirationForFiber } from "../MFiberScheduler/MFiberScheduler"

export function updateContainer(
  element: MNodeList,
  container: FiberRoot,
  parentComponent?: M$Component,
  callback?: Function
) {
  const { current } = container
  const currentTime = requestCurrentTime()
  const expirationTime = computeExpirationForFiber( currentTime, current )
  // return updateContainerAtExpirationTime(
  //   element,
  //   container,
  //   parentComponent,
  //   expirationTime,
  //   callback
  // )
}