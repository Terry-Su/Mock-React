import { createElement } from "../MElement"
import { render } from "../../m-dom"
import { JSDOM }  from 'jsdom'

const document = ( new JSDOM() ).window.document
const g: any = global
g[ 'document' ] = document


const place = ( element: any, log?: boolean ) => log && console.log( element )

describe( 'm', () => {
  it( 'M.createElement', () => {
    const mElement = createElement( 'div' )
    place( mElement )
  } )
} )



describe( 'm-dom', () => {
  it( 'MDom.render', () => {
    const childMElement = createElement( 'div' )
    const mElement = createElement( 'div', { children: childMElement }  )
    render( mElement, document.body )
    place( document.body )
  } )
} )