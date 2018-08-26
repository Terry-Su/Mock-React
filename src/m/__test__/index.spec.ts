import { createElement } from "../MElement"
import { mount } from "../../m-tmp/mount"
import mountTree from "../../m-tmp/mountTree"
import { place } from "../../util/__test__"


describe( 'm', () => {
  it( 'M.createElement', () => {
    const mElement = createElement( 'div' )
    place( mElement )
  } )
} )

