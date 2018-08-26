import { JSDOM }  from 'jsdom'

const g: any = global
export const resetDocument = () => { g[ 'document' ] = ( new JSDOM() ).window.document }

export const place = ( element: any, log?: boolean ) => log && console.log( element )



