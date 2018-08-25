import { createElement } from "../MElement";

describe( 'M', () => {
  it( 'createElement', () => {
    const div = createElement( 'div', { children: 123 } )
    console.log( div )
  } )
} )