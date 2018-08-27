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