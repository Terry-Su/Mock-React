import { DOCUMENT_NODE } from "../shared/constant/HTMLNodeType"

export default function( container: DOMContainer ) {
  if ( !container ) {
    return null
  }

  if ( container.nodeType === DOCUMENT_NODE ) {
    return container.documentElement
  } else {
    return container.firstChild
  }
}
