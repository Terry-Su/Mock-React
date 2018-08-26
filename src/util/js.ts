import { isNil } from "./lodash"


export const notNil = ( element: any ) => ! isNil( element )
export const notArray = ( element: any ) => ! Array.isArray( element )
