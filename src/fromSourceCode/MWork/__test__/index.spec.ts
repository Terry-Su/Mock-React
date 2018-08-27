import MWork from "../MWork"

describe( 'MWork', () => {
  it( 'work only once', () => {
    const work = new MWork()
    const log1 = () => console.log( 1 )
    const log2 = () => console.log( 2 )
    work.then( log1 )
    work.then( log2 )
    work._onCommit()
    work._onCommit()
  } )
} )

