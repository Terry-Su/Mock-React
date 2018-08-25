import { mount } from "../m-tmp/mount"

/**
 * 
 * @param element 
 * @param container Dom element 
 */
export const render = ( element: MElement, container: any ) => {
  const dom = mount( element )
  container.appendChild( dom )
}