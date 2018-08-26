import { resetDocument, place } from "../../util/__test__"
import { createElement } from "../../m/MElement"
import { mount } from "../mount"

describe( 'm-tmp', () => {
  it( 'mount', () => {
    resetDocument()
    const childMElement = createElement( 'div' )
    const mElement = createElement( 'div', { children: childMElement }  )
    const node = mount( mElement )
    document.body.appendChild( node )
    place( document.body )
  } )
} )