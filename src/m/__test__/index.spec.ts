import { createElement } from "../MElement"
import { render } from "../../m-dom"
import { JSDOM }  from 'jsdom'
import { mount } from "../../m-tmp/mount"
import mountTree from "../../m-tmp/mountTree"

const g: any = global
const resetDocument = () => { g[ 'document' ] = ( new JSDOM() ).window.document }

resetDocument()

const place = ( element: any, log?: boolean ) => log && console.log( element )

describe( 'm', () => {
  it( 'M.createElement', () => {
    const mElement = createElement( 'div' )
    place( mElement )
  } )
} )



describe( 'm-tmp', () => {
  it( 'mount', () => {
    resetDocument()
    const childMElement = createElement( 'div' )
    const mElement = createElement( 'div', { children: childMElement }  )
    const node = mount( mElement )
    document.body.appendChild( node )
    place( document.body )
  } )

  it ( 'mountTree', () => {
    resetDocument()
    const childMElement = createElement( 'div' )
    const mElement = createElement( 'div', { children: childMElement }  )
    mountTree( mElement, document.body )
    place( document.body )
  } )
} )