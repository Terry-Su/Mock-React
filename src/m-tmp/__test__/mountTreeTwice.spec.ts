import { resetDocument, place } from "../../util/__test__"
import { createElement } from "../../m/MElement"
import mountTree from "../mountTree"


describe( 'm-tmp', () => {
  it ( 'mountTree', () => {
    resetDocument()
    const childMElement = createElement( 'p', { innerHTML: '123' } )
    const mElement = createElement( 'div', { children: childMElement }  )
    mountTree( mElement, document.body )
    mountTree( mElement, document.body )
    place( document.body )
  } )
} )