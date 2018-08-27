<<<<<<< HEAD
import legacyRenderSubtreeIntoContainer from "./legacyRenderSubtreeIntoContainer"

=======
>>>>>>> 12c5b48b7faf68aa5b2e82d5ddcf75e51d2c285d
const MDOM = {
  render(
    element: M$Element,
    container: DOMContainer,
    callback?: Function
  ) {
    return legacyRenderSubtreeIntoContainer(
      null,
      element,
      container,
      false,
      callback,
    )
  },
}

export default MDOM